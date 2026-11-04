import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { getEntitlements } from "@/lib/services/entitlements";
import { activate, orderCode } from "@/lib/services/store";
import { getAddon, TRIAL_DAYS } from "@/modules/plans";

const Body = z.object({ module: z.string().min(1).max(40) });

/** Dùng thử plugin 14 ngày — mỗi plugin 1 lần / doanh nghiệp */
export const POST = withAuth("billing.manage", async (req, ctx) => {
  const { module } = await parseBody(req, Body);
  if (!getAddon(module)) throw new ApiError(422, "Plugin không tồn tại");
  if ((await getEntitlements(ctx.tid)).modules.has(module)) throw new ApiError(409, "Bạn đang dùng plugin này rồi");
  const O = schema.addonOrders;
  const [used] = await db.select({ id: O.id }).from(O).where(and(eq(O.tenantId, ctx.tid), eq(O.kind, "trial"), eq(O.target, module)));
  if (used) throw new ApiError(409, "Bạn đã dùng thử plugin này trước đây");
  await db.transaction(async (tx) => {
    await tx.insert(O).values({ tenantId: ctx.tid, kind: "trial", target: module, months: 0, amount: 0, code: orderCode(), status: "paid", paidAt: new Date(), createdBy: ctx.sub });
    await activate(tx, { tenantId: ctx.tid, kind: "addon", target: module, months: 0 }, TRIAL_DAYS);
  });
  await audit(ctx, "store.trial", "module", module);
  return ok({ module, days: TRIAL_DAYS });
});
