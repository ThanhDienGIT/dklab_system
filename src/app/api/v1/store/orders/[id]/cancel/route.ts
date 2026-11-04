import { and, eq } from "drizzle-orm";
import { ApiError, audit, ok, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";

export const POST = withAuth<{ id: string }>("billing.manage", async (_req, ctx, { id }) => {
  const O = schema.addonOrders;
  const [row] = await db.update(O).set({ status: "cancelled" }).where(and(eq(O.id, id), eq(O.tenantId, ctx.tid), eq(O.status, "pending"))).returning();
  if (!row) throw new ApiError(404, "Không tìm thấy đơn đang chờ thanh toán");
  await audit(ctx, "store.cancel", "addon_order", id);
  return ok(row);
});
