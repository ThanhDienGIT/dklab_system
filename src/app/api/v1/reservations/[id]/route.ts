import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { isOverlapError } from "@/lib/services/availability";
import { assertOwned } from "@/lib/services/guard";

const V = schema.reservations;
const Patch = z.object({
  status: z.enum(["pending", "confirmed", "checked_in", "completed", "cancelled", "no_show"]).optional(),
  resourceId: z.uuid().optional(),
  startAt: z.iso.datetime({ offset: true }).optional(),
  endAt: z.iso.datetime({ offset: true }).optional(),
});

/** Đổi trạng thái (khách đến, trả bàn/phòng, không đến) hoặc chuyển bàn / đổi giờ. */
export const PATCH = withAuth<{ id: string }>("booking.handle", async (req, ctx, { id }) => {
  const b = await parseBody(req, Patch);
  const [cur] = await db.select().from(V).where(and(eq(V.id, id), eq(V.tenantId, ctx.tid)));
  if (!cur) throw new ApiError(404, "Không tìm thấy lượt giữ chỗ");
  await assertOwned(schema.resources, b.resourceId, ctx.tid);
  const startAt = b.startAt ? new Date(b.startAt) : cur.startAt;
  const endAt = b.endAt ? new Date(b.endAt) : cur.endAt;
  if (endAt <= startAt) throw new ApiError(422, "Giờ kết thúc phải sau giờ bắt đầu");
  const [row] = await db
    .update(V)
    .set({ ...(b.status ? { status: b.status } : {}), ...(b.resourceId ? { resourceId: b.resourceId } : {}), startAt, endAt })
    .where(eq(V.id, id))
    .returning()
    .catch((e) => {
      if (isOverlapError(e)) throw new ApiError(409, "Trùng với lượt khác trên chỗ / khung giờ này");
      throw e;
    });
  // Khách đến / xong: cập nhật đặt chỗ gốc cho đồng bộ danh sách lễ tân
  if (cur.bookingId && b.status) {
    const map: Record<string, string> = { checked_in: "confirmed", confirmed: "confirmed", completed: "completed", cancelled: "cancelled", no_show: "cancelled" };
    if (map[b.status]) await db.update(schema.bookingRequests).set({ status: map[b.status] }).where(and(eq(schema.bookingRequests.id, cur.bookingId), eq(schema.bookingRequests.tenantId, ctx.tid)));
  }
  await audit(ctx, "reservation.update", "reservation", id, b);
  return ok(row);
});
