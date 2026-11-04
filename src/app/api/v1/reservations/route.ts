import { and, asc, eq, gt, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { addDays, isOverlapError, vnDate, vnToday } from "@/lib/services/availability";
import { assertOwned } from "@/lib/services/guard";
import { optionalText } from "@/lib/validators";

const V = schema.reservations;
const B = schema.bookingRequests;

/** Lịch giữ chỗ theo ngày (from..to theo ngày VN) cho màn hình Lịch / timeline. */
export const GET = withAuth("schedule.view", async (req, ctx) => {
  const from = req.nextUrl.searchParams.get("date") ?? vnToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) throw new ApiError(422, "Ngày không hợp lệ");
  const days = Math.min(31, Math.max(1, Number(req.nextUrl.searchParams.get("days") ?? 1)));
  const s = vnDate(from);
  const e = vnDate(addDays(from, days));
  const rows = await db
    .select({ r: V, fullName: B.fullName, phone: B.phone, code: B.code, bookingStatus: B.status, item: schema.catalogItems.name })
    .from(V)
    .leftJoin(B, eq(B.id, V.bookingId))
    .leftJoin(schema.catalogItems, eq(schema.catalogItems.id, V.itemId))
    .where(and(eq(V.tenantId, ctx.tid), inArray(V.status, ["pending", "confirmed", "checked_in", "completed"]), lt(V.startAt, e), gt(V.endAt, s)))
    .orderBy(asc(V.startAt));
  return ok(rows.map((x) => ({ ...x.r, name: x.fullName ?? x.r.label, phone: x.phone, code: x.code, itemName: x.item })));
});

/** Khách vãng lai / lễ tân xếp chỗ trực tiếp */
const Walkin = z.object({
  resourceId: z.uuid(),
  itemId: z.uuid().nullable().optional(),
  startAt: z.iso.datetime({ offset: true }).optional(),
  durationMin: z.coerce.number().int().min(15).max(60 * 24 * 30).default(90),
  partySize: z.coerce.number().int().min(1).max(200).default(1),
  label: optionalText(80),
  status: z.enum(["confirmed", "checked_in"]).default("checked_in"),
});

export const POST = withAuth("booking.handle", async (req, ctx) => {
  const b = await parseBody(req, Walkin);
  await assertOwned(schema.resources, b.resourceId, ctx.tid);
  await assertOwned(schema.catalogItems, b.itemId, ctx.tid);
  const startAt = b.startAt ? new Date(b.startAt) : new Date();
  const endAt = new Date(startAt.getTime() + b.durationMin * 60_000);
  const [row] = await db
    .insert(V)
    .values({ tenantId: ctx.tid, resourceId: b.resourceId, itemId: b.itemId ?? null, startAt, endAt, partySize: b.partySize, label: b.label || "Khách vãng lai", status: b.status })
    .returning()
    .catch((e) => {
      if (isOverlapError(e)) throw new ApiError(409, "Chỗ này đang có khách hoặc đã được đặt trong khung giờ đó");
      throw e;
    });
  await audit(ctx, "reservation.walkin", "reservation", row.id, { resourceId: b.resourceId });
  return ok(row);
});
