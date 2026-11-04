import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError, ok, parseBody } from "@/lib/api";
import { platformAudit, withPlatform } from "@/lib/auth/platform";
import { db, schema } from "@/lib/db";
import { activate } from "@/lib/services/store";

const Body = z.object({ action: z.enum(["approve", "reject"]), note: z.string().trim().max(500).optional() });

/** Super Admin xác nhận đã nhận tiền => kích hoạt gói / plugin (cộng dồn hạn), hoặc từ chối đơn */
export const POST = withPlatform<{ id: string }>(async (req, ctx, { id }) => {
  const b = await parseBody(req, Body);
  const O = schema.addonOrders;
  const result = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(O).where(and(eq(O.id, id), eq(O.status, "pending"))).for("update");
    if (!o) throw new ApiError(404, "Không tìm thấy đơn đang chờ");
    if (b.action === "reject") {
      await tx.update(O).set({ status: "cancelled", note: b.note ?? "Từ chối", approvedBy: ctx.sub }).where(eq(O.id, id));
      return { ...o, status: "cancelled" };
    }
    await activate(tx, { tenantId: o.tenantId, kind: o.kind, target: o.target, months: o.months });
    await tx.update(O).set({ status: "paid", paidAt: new Date(), approvedBy: ctx.sub, note: b.note ?? null }).where(eq(O.id, id));
    return { ...o, status: "paid" };
  });
  await platformAudit(ctx, b.action === "approve" ? "store.approve" : "store.reject", result.tenantId, { code: result.code, kind: result.kind, target: result.target, months: result.months, amount: result.amount });
  return ok(result);
});
