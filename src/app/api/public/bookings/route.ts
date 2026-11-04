import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, clientIp, fail, ok, parseBody } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { shortCode } from "@/lib/services/codes";
import { upsertCustomer } from "@/lib/services/customers";
import { getTenantFresh } from "@/lib/tenant";
import { rateLimit } from "@/lib/ratelimit";
import { and, inArray } from "drizzle-orm";
import { bookingConfig, getItem, isOverlapError, nightsBetween, pickFreeResource, roomAvailability, timeOptions, vnDate, vnToday } from "@/lib/services/availability";
import { emailSchema, optionalText, phoneSchema } from "@/lib/validators";

/**
 * Khách gửi yêu cầu đặt chỗ (không cần đăng nhập).
 * Chưa trừ chỗ: lễ tân / người có quyền gọi điện xác nhận thì mới tính.
 */
const Body = z
  .object({
    resourceType: z.enum(["tour", "table", "room", "service"]),
    /** Dịch vụ (slots) / loại phòng (rooms) */
    itemId: z.uuid().optional().nullable(),
    /** Nhân viên được chọn (slots) */
    staffId: z.uuid().optional().nullable(),
    checkIn: z.iso.date().optional().nullable(),
    checkOut: z.iso.date().optional().nullable(),
    /** Món đặt trước (tables + preorder) */
    items: z.array(z.object({ itemId: z.uuid(), qty: z.coerce.number().int().min(1).max(50) })).max(30).optional(),
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

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!(await rateLimit(`booking:ip:${ip}`, 5, 600)).ok)
      throw new ApiError(429, "Bạn gửi quá nhiều yêu cầu, vui lòng thử lại sau ít phút hoặc gọi hotline");
    const b = await parseBody(req, Body, 10_000);
    if (b.website) return ok({ code: "OK" }); // bot
    const who = b.phone || b.email;
    if (!(await rateLimit(`booking:who:${who}`, 5, 3600)).ok)
      throw new ApiError(429, "Số điện thoại / email này đã gửi nhiều yêu cầu. Nhân viên sẽ liên hệ sớm, vui lòng chờ");
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

    /* ───────── Động cơ slots / tables / rooms: chọn tài nguyên trống + giữ chỗ ───────── */
    type Hold = { resourceId: string; startAt: Date; endAt: Date; partySize: number; itemId: string | null };
    const holds: Hold[] = [];
    let itemId: string | null = null;
    let startAt: Date | null = null;
    let endAt: Date | null = null;
    let preItems: { itemId: string; name: string; qty: number; price: number }[] | null = null;
    const cfg = bookingConfig(tenant);
    const party = b.adults + b.children;
    const busyMsg = "Khung giờ này vừa có người đặt, vui lòng chọn giờ hoặc chỗ khác";

    if (b.resourceType === "service" && b.itemId) {
      if (cfg.engine !== "slots") throw new ApiError(422, "Doanh nghiệp này không nhận đặt lịch dịch vụ");
      if (!b.bookingDate || !b.bookingTime) throw new ApiError(422, "Vui lòng chọn ngày và giờ");
      if (b.bookingDate < vnToday()) throw new ApiError(422, "Ngày đã qua");
      const item = await getItem(tenant.id, b.itemId);
      const dur = item.durationMin || cfg.durationMin || 60;
      startAt = vnDate(b.bookingDate, b.bookingTime);
      endAt = new Date(startAt.getTime() + dur * 60_000);
      const okTime = b.bookingTime >= cfg.open && vnDate(b.bookingDate, cfg.close) >= endAt && startAt.getTime() > Date.now() + 15 * 60_000;
      if (!okTime) throw new ApiError(422, "Giờ đã chọn nằm ngoài giờ làm việc hoặc đã qua");
      const staff = await pickFreeResource(tenant.id, ["staff"], startAt, endAt, { only: b.staffId ?? undefined });
      if (!staff) throw new ApiError(409, busyMsg);
      holds.push({ resourceId: staff.id, startAt, endAt, partySize: 1, itemId: item.id });
      if (cfg.needsBed) {
        const bed = await pickFreeResource(tenant.id, ["bed"], startAt, endAt);
        if (!bed) throw new ApiError(409, busyMsg);
        holds.push({ resourceId: bed.id, startAt, endAt, partySize: 1, itemId: item.id });
      }
      itemId = item.id;
      label = `${item.name} · ${staff.name}`;
      estimated = item.price;
      bookingDate = b.bookingDate;
    }

    if (b.resourceType === "table") {
      if (cfg.engine !== "tables") throw new ApiError(422, "Doanh nghiệp này không nhận đặt bàn");
      if (!b.bookingDate || !b.bookingTime) throw new ApiError(422, "Vui lòng chọn ngày và giờ đến");
      if (!timeOptions(cfg, 15, b.bookingDate).includes(b.bookingTime)) throw new ApiError(422, "Giờ đến không hợp lệ hoặc đã qua");
      startAt = vnDate(b.bookingDate, b.bookingTime);
      endAt = new Date(startAt.getTime() + cfg.durationMin * 60_000);
      const table = await pickFreeResource(tenant.id, ["table"], startAt, endAt, { minCapacity: party, only: b.resourceId ?? undefined });
      if (!table) throw new ApiError(409, b.resourceId ? "Bàn này vừa có người đặt hoặc không đủ chỗ, vui lòng chọn bàn khác" : "Đã hết bàn phù hợp ở giờ này, vui lòng chọn giờ khác");
      holds.push({ resourceId: table.id, startAt, endAt, partySize: party, itemId: null });
      label = `Bàn ${table.name}${table.area ? ` · ${table.area}` : ""}`;
      bookingDate = b.bookingDate;
      if (b.items?.length) {
        if (!cfg.preorder) throw new ApiError(422, "Quán chưa nhận đặt món trước");
        const ids = [...new Set(b.items.map((x) => x.itemId))];
        const rows = await db
          .select({ id: schema.catalogItems.id, name: schema.catalogItems.name, price: schema.catalogItems.price })
          .from(schema.catalogItems)
          .where(and(eq(schema.catalogItems.tenantId, tenant.id), eq(schema.catalogItems.isActive, true), inArray(schema.catalogItems.id, ids)));
        if (rows.length !== ids.length) throw new ApiError(422, "Có món không còn phục vụ");
        preItems = b.items.map((x) => {
          const r = rows.find((y) => y.id === x.itemId)!;
          return { itemId: r.id, name: r.name, qty: x.qty, price: r.price };
        });
        estimated = preItems.reduce((sum, x) => sum + x.qty * x.price, 0);
      }
    }

    if (b.resourceType === "room") {
      if (cfg.engine !== "rooms") throw new ApiError(422, "Doanh nghiệp này không nhận đặt phòng");
      if (!b.itemId || !b.checkIn || !b.checkOut) throw new ApiError(422, "Vui lòng chọn loại phòng, ngày nhận và trả phòng");
      const av = await roomAvailability(tenant, b.checkIn, b.checkOut, party);
      const type = av.types.find((x) => x.id === b.itemId);
      if (!type) throw new ApiError(404, "Không tìm thấy loại phòng");
      if (!type.fits) throw new ApiError(422, `Loại phòng này tối đa ${type.capacity} khách`);
      startAt = vnDate(b.checkIn, cfg.open);
      endAt = vnDate(b.checkOut, cfg.close);
      const room = await pickFreeResource(tenant.id, ["room"], startAt, endAt, { itemId: type.id });
      if (!room) throw new ApiError(409, "Loại phòng này đã hết trong khoảng ngày bạn chọn");
      holds.push({ resourceId: room.id, startAt, endAt, partySize: party, itemId: type.id });
      const nights = nightsBetween(b.checkIn, b.checkOut);
      itemId = type.id;
      label = `${type.name} · ${nights} đêm (${b.checkIn.split("-").reverse().join("/")} → ${b.checkOut.split("-").reverse().join("/")})`;
      estimated = type.price * nights;
      bookingDate = b.checkIn;
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
          itemId,
          startAt,
          endAt,
          items: preItems,
          customerId,
          source: "website",
        })
        .returning({ id: schema.bookingRequests.id, code: schema.bookingRequests.code });
      // Giữ chỗ ngay (trạng thái pending) để người khác không đặt trùng trong lúc chờ gọi xác nhận
      if (holds.length)
        await tx.insert(schema.reservations).values(holds.map((h) => ({ ...h, tenantId: tenant.id, bookingId: row.id, status: "pending" })));
      return row;
    }).catch((e) => {
      if (isOverlapError(e)) throw new ApiError(409, busyMsg);
      throw e;
    });
    return ok({ code: result.code, estimatedTotal: estimated });
  } catch (e) {
    return fail(e);
  }
}
