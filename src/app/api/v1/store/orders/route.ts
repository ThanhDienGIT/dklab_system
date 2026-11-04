import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { orderCode, orderQR } from "@/lib/services/store";
import { getAddon, getPlan, PLANS, priceFor, TERMS } from "@/modules/plans";

const Body = z.object({
  kind: z.enum(["addon", "plan"]),
  target: z.string().min(1).max(40),
  months: z.coerce.number().int().refine((m) => (TERMS as readonly number[]).includes(m), "Kỳ hạn không hợp lệ"),
});

/** Tạo đơn mua — giá do SERVER tính theo bảng giá, client không gửi giá */
export const POST = withAuth("billing.manage", async (req, ctx) => {
  const b = await parseBody(req, Body);
  let monthly: number;
  if (b.kind === "addon") {
    const a = getAddon(b.target);
    if (!a) throw new ApiError(422, "Plugin không tồn tại");
    monthly = a.price;
  } else {
    if (!PLANS.some((p) => p.key === b.target)) throw new ApiError(422, "Gói không tồn tại");
    monthly = getPlan(b.target).price;
  }
  const O = schema.addonOrders;
  // Đã có đơn chờ thanh toán cho cùng mục => trả lại đơn đó (tránh tạo trùng)
  const [dup] = await db.select().from(O).where(and(eq(O.tenantId, ctx.tid), eq(O.target, b.target), eq(O.kind, b.kind), eq(O.status, "pending")));
  if (dup) {
    await db.update(O).set({ months: b.months, amount: priceFor(monthly, b.months) }).where(eq(O.id, dup.id));
    const amount = priceFor(monthly, b.months);
    return ok({ ...dup, months: b.months, amount, qrPayload: orderQR(amount, dup.code) });
  }
  const amount = priceFor(monthly, b.months);
  const [row] = await db.insert(O).values({ tenantId: ctx.tid, kind: b.kind, target: b.target, months: b.months, amount, code: orderCode(), createdBy: ctx.sub }).returning();
  await audit(ctx, "store.order", "addon_order", row.id, { kind: b.kind, target: b.target, months: b.months, amount });
  return ok({ ...row, qrPayload: orderQR(amount, row.code) });
});
