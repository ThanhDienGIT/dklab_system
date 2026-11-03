import { and, eq } from "drizzle-orm";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { DepartureBody } from "@/lib/schemas";
import { invalidateTours } from "@/lib/services/cache";

const D = schema.tourDepartures;

export const PATCH = withAuth<{ id: string }>("tour.manage", async (req, ctx, { id }) => {
  const b = await parseBody(req, DepartureBody);
  const [cur] = await db.select().from(D).where(and(eq(D.id, id), eq(D.tenantId, ctx.tid)));
  if (!cur) throw new ApiError(404, "Không tìm thấy lịch khởi hành");
  if (b.seatsTotal < cur.seatsBooked) throw new ApiError(422, `Đã xác nhận ${cur.seatsBooked} chỗ, không thể giảm tổng chỗ thấp hơn`);
  const [row] = await db.update(D).set({ ...b, price: b.price ?? null }).where(eq(D.id, id)).returning();
  invalidateTours(ctx.tid);
  await audit(ctx, "departure.update", "departure", id, b);
  return ok(row);
});

export const DELETE = withAuth<{ id: string }>("tour.manage", async (_req, ctx, { id }) => {
  const [cur] = await db.select().from(D).where(and(eq(D.id, id), eq(D.tenantId, ctx.tid)));
  if (!cur) throw new ApiError(404, "Không tìm thấy lịch khởi hành");
  if (cur.seatsBooked > 0) throw new ApiError(422, "Lịch đã có khách xác nhận, hãy chuyển sang 'Đóng' thay vì xóa");
  await db.delete(D).where(eq(D.id, id));
  invalidateTours(ctx.tid);
  await audit(ctx, "departure.delete", "departure", id);
  return ok({ id });
});
