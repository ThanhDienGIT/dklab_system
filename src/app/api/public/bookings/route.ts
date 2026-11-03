import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, clientIp, fail, ok, parseBody } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { shortCode } from "@/lib/services/codes";
import { upsertCustomer } from "@/lib/services/customers";
import { getTenantFresh } from "@/lib/tenant";
import { emailSchema, optionalText, phoneSchema } from "@/lib/validators";

/**
 * Khách gửi yêu cầu đặt chỗ (không cần đăng nhập).
 * Chưa trừ chỗ: lễ tân / người có quyền gọi điện xác nhận thì mới tính.
 */
const Body = z
  .object({
    resourceType: z.enum(["tour", "table", "room", "service"]),
    resourceId: z.uuid().optional().nullable(),
    slotId: z.uuid().optional().nullable(),
    bookingDate: z.iso.date().optional().nullable(),
    bookingTime: optionalText(20),
    adults: z.coerce.number().int().min(1).max(200).default(1),
    children: z.coerce.number().int().min(0).max(200).default(0),
    fullName: z.string().trim().min(2, "Vui lòng nhập họ tên").max(120),
    phone: phoneSchema.optional().default(""),
    email: emailSchema.optional().default(""),
    note: optionalText(1000),
    consent: z.literal(true, { error: "Vui lòng đồng ý để chúng tôi liên hệ xác nhận" }),
    website: z.string().optional(), // honeypot chống bot: người thật không điền
  })
  .refine((b) => b.phone || b.email, { message: "Vui lòng để lại số điện thoại hoặc email (ưu tiên số điện thoại)", path: ["phone"] });

// Giới hạn tần suất đơn giản theo IP (mỗi instance). Production nên dùng Upstash/Redis.
const hits = new Map<string, number[]>();
function rateLimit(ip: string, max = 5, windowMs = 10 * 60_000) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) throw new ApiError(429, "Bạn gửi quá nhiều yêu cầu, vui lòng thử lại sau ít phút hoặc gọi hotline");
  arr.push(now);
  hits.set(ip, arr);
}

export async function POST(req: NextRequest) {
  try {
    rateLimit(clientIp(req) ?? "unknown");
    const b = await parseBody(req, Body);
    if (b.website) return ok({ code: "OK" }); // bot
    const tenant = await getTenantFresh(req.headers.get("x-tenant-key") ?? "");
    if (!tenant || tenant.status !== "active") throw new ApiError(404, "Không tìm thấy doanh nghiệp");

    let label: string | null = null;
    let estimated = 0;
    let bookingDate = b.bookingDate ?? null;
    if (b.resourceType === "tour") {
      if (!b.resourceId) throw new ApiError(422, "Vui lòng chọn tour");
      const [tour] = await db
        .select()
        .from(schema.tours)
        .where(and(eq(schema.tours.id, b.resourceId), eq(schema.tours.tenantId, tenant.id), eq(schema.tours.isPublished, true)));
      if (!tour) throw new ApiError(404, "Tour không tồn tại");
      label = tour.title;
      let adultPrice = tour.basePrice;
      if (b.slotId) {
        const [dep] = await db
          .select()
          .from(schema.tourDepartures)
          .where(and(eq(schema.tourDepartures.id, b.slotId), eq(schema.tourDepartures.tourId, tour.id)));
        if (!dep || dep.status !== "open") throw new ApiError(422, "Ngày khởi hành không còn nhận khách");
        if (dep.seatsTotal - dep.seatsBooked < b.adults + b.children)
          throw new ApiError(422, `Ngày này chỉ còn ${dep.seatsTotal - dep.seatsBooked} chỗ`);
        bookingDate = dep.departDate;
        adultPrice = dep.price ?? tour.basePrice;
      }
      estimated = adultPrice * b.adults + (tour.childPrice || adultPrice) * b.children;
    }

    const result = await db.transaction(async (tx) => {
      const customerId = await upsertCustomer(tx, tenant.id, { fullName: b.fullName, phone: b.phone || null, email: b.email || null, consent: true });
      const [row] = await tx
        .insert(schema.bookingRequests)
        .values({
          tenantId: tenant.id,
          code: shortCode("DC"),
          resourceType: b.resourceType,
          resourceId: b.resourceId ?? null,
          slotId: b.slotId ?? null,
          resourceLabel: label,
          bookingDate,
          bookingTime: b.bookingTime ?? null,
          adults: b.adults,
          children: b.children,
          fullName: b.fullName,
          phone: b.phone || null,
          email: b.email || null,
          note: b.note ?? null,
          estimatedTotal: estimated,
          customerId,
          source: "website",
        })
        .returning({ code: schema.bookingRequests.code });
      return row;
    });
    return ok({ code: result.code, estimatedTotal: estimated });
  } catch (e) {
    return fail(e);
  }
}
