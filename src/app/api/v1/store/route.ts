import { and, desc, eq } from "drizzle-orm";
import { ok, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { getEntitlements } from "@/lib/services/entitlements";
import { orderQR, platformBank } from "@/lib/services/store";
import { getPreset } from "@/modules/presets";
import { ADDONS, PLANS, TRIAL_DAYS } from "@/modules/plans";

/** Cửa hàng: gói hiện tại, danh sách plugin + trạng thái, đơn mua */
export const GET = withAuth("billing.manage", async (_req, ctx) => {
  const [ent, [t], orders, trials] = await Promise.all([
    getEntitlements(ctx.tid),
    db.select({ industry: schema.tenants.industry }).from(schema.tenants).where(eq(schema.tenants.id, ctx.tid)),
    db.select().from(schema.addonOrders).where(eq(schema.addonOrders.tenantId, ctx.tid)).orderBy(desc(schema.addonOrders.createdAt)).limit(50),
    db.select({ target: schema.addonOrders.target }).from(schema.addonOrders).where(and(eq(schema.addonOrders.tenantId, ctx.tid), eq(schema.addonOrders.kind, "trial"))),
  ]);
  const preset = getPreset(t.industry);
  const used = new Set(trials.map((x) => x.target));
  const plan = PLANS.find((p) => p.key === ent.plan)!;
  return ok({
    plan: { key: ent.plan, expiresAt: ent.planExpiresAt },
    plans: PLANS,
    trialDays: TRIAL_DAYS,
    bank: platformBank(),
    addons: ADDONS.map((a) => {
      const g = ent.grants.find((x) => x.key === a.key);
      return {
        ...a,
        active: !!g,
        source: g?.source ?? null,
        expiresAt: g?.expiresAt ?? null,
        inIndustry: preset.modules.includes(a.key),
        inPlan: plan.includes.includes(a.key),
        trialAvailable: !g && !used.has(a.key),
      };
    }),
    orders: orders.map((o) => ({ ...o, qrPayload: o.status === "pending" ? orderQR(o.amount, o.code) : null })),
  });
});
