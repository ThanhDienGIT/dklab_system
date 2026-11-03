import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { shortCode } from "@/lib/services/codes";
import { upsertCustomer } from "@/lib/services/customers";
import { assertOwned } from "@/lib/services/guard";
import { emailSchema, optionalText, phoneSchema } from "@/lib/validators";

const B = schema.bookingRequests;

export const GET = withAuth("booking.view", async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const q = sp.get("q")?.trim();
  const type = sp.get("type");
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const size = Math.min(100, Number(sp.get("size") ?? 30));

  const where: SQL[] = [eq(B.tenantId, ctx.tid)];
  if (ctx.scope === "own") where.push(eq(B.assignedTo, ctx.sub));
  if (status && status !== "all") where.push(eq(B.status, status));
  if (type) where.push(eq(B.resourceType, type));
  if (q) where.push(or(ilike(B.fullName, `%${q}%`), ilike(B.phone, `%${q}%`), ilike(B.email, `%${q}%`), ilike(B.code, `%${q}%`))!);

  const [rows, [{ total }], counts] = await Promise.all([
    db
      .select({ b: B, assignee: schema.users.fullName })
      .from(B)
      .leftJoin(schema.users, eq(schema.users.id, B.assignedTo))
      .where(and(...where))
      .orderBy(sql`case ${B.status} when 'new' then 0 when 'contacted' then 1 else 2 end`, desc(B.createdAt))
      .limit(size)
      .offset((page - 1) * size),
    db.select({ total: sql<number>`count(*)::int` }).from(B).where(and(...where)),
    db
      .select({ status: B.status, n: sql<number>`count(*)::int` })
      .from(B)
      .where(and(eq(B.tenantId, ctx.tid), ...(ctx.scope === "own" ? [eq(B.assignedTo, ctx.sub)] : [])))
      .groupBy(B.status),
  ]);
  return ok({
    items: rows.map((r) => ({ ...r.b, assigneeName: r.assignee })),
    total,
    page,
    size,
    counts: Object.fromEntries(counts.map((c) => [c.status, c.n])),
  });
});

/** Lễ tân tạo đặt chỗ khi khách gọi điện / đến trực tiếp */
const CreateBody = z
  .object({
    resourceType: z.enum(["tour", "table", "room", "service"]).default("tour"),
    resourceId: z.uuid().optional().nullable(),
    slotId: z.uuid().optional().nullable(),
    resourceLabel: optionalText(200),
    bookingDate: z.iso.date().optional().nullable(),
    bookingTime: optionalText(20),
    adults: z.coerce.number().int().min(1).default(1),
    children: z.coerce.number().int().min(0).default(0),
    fullName: z.string().trim().min(2, "Nhập họ tên khách"),
    phone: phoneSchema.optional().default(""),
    email: emailSchema.optional().default(""),
    note: optionalText(1000),
    source: z.string().default("phone"),
    estimatedTotal: z.coerce.number().int().min(0).default(0),
  })
  .refine((b) => b.phone || b.email, { message: "Cần SĐT hoặc email của khách", path: ["phone"] });

export const POST = withAuth("booking.handle", async (req, ctx) => {
  const b = await parseBody(req, CreateBody);
  // Mọi ID từ client phải thuộc tenant hiện tại (chống IDOR chéo tenant)
  if (b.resourceType === "tour") {
    await assertOwned(schema.tours, b.resourceId, ctx.tid);
    if (b.slotId) {
      if (!b.resourceId) throw new ApiError(422, "Chọn tour trước khi chọn ngày khởi hành");
      await assertOwned(schema.tourDepartures, b.slotId, ctx.tid, eq(schema.tourDepartures.tourId, b.resourceId));
    }
  } else if (b.resourceId || b.slotId) {
    throw new ApiError(422, "Loại đặt chỗ này chưa hỗ trợ chọn tài nguyên");
  }
  let label = b.resourceLabel ?? null;
  if (b.resourceType === "tour" && b.resourceId && !label) {
    const [t] = await db.select({ title: schema.tours.title }).from(schema.tours).where(and(eq(schema.tours.id, b.resourceId), eq(schema.tours.tenantId, ctx.tid)));
    label = t?.title ?? null;
  }
  const row = await db.transaction(async (tx) => {
    const customerId = await upsertCustomer(tx, ctx.tid, { fullName: b.fullName, phone: b.phone || null, email: b.email || null, source: b.source });
    const [r] = await tx
      .insert(B)
      .values({ ...b, phone: b.phone || null, email: b.email || null, resourceLabel: label, tenantId: ctx.tid, code: shortCode("DC"), customerId, status: "contacted", assignedTo: ctx.sub, handledAt: new Date() })
      .returning();
    return r;
  });
  await audit(ctx, "booking.create", "booking", row.id, { code: row.code });
  return ok(row);
});
