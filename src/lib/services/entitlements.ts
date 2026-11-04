import "server-only";
/**
 * Quyền sử dụng module của doanh nghiệp (nguồn sự thật duy nhất, dùng cả cho menu lẫn chặn API):
 *   module lõi  ∪  module theo ngành (preset)  ∪  plugin tặng kèm gói (nếu gói còn hạn)
 *   ∪  plugin mua / dùng thử / Super Admin cấp (nếu còn hạn)
 * Cache 15 giây / tenant; thay đổi trên cùng instance xóa cache ngay.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { getPreset } from "@/modules/presets";
import { getPlan } from "@/modules/plans";
import { MODULES } from "@/modules/registry";

export type ModuleGrant = { key: string; source: "core" | "industry" | "plan" | "addon" | "trial" | "manual"; expiresAt: string | null };
export type Entitlements = { plan: string; planExpiresAt: string | null; planActive: boolean; modules: Set<string>; grants: ModuleGrant[] };

const CORE = MODULES.filter((m) => m.core).map((m) => m.key);
const cache = new Map<string, { v: Entitlements; exp: number }>();
export const invalidateEntitlements = (tid?: string) => (tid ? cache.delete(tid) : cache.clear());

export async function getEntitlements(tid: string): Promise<Entitlements> {
  const hit = cache.get(tid);
  if (hit && hit.exp > Date.now()) return hit.v;
  const [[t], rows] = await Promise.all([
    db.select({ industry: schema.tenants.industry, plan: schema.tenants.plan, planExpiresAt: schema.tenants.planExpiresAt }).from(schema.tenants).where(eq(schema.tenants.id, tid)),
    db.select().from(schema.tenantModules).where(eq(schema.tenantModules.tenantId, tid)),
  ]);
  const now = Date.now();
  const grants = new Map<string, ModuleGrant>();
  const add = (g: ModuleGrant) => {
    const cur = grants.get(g.key);
    // Ưu tiên quyền không hết hạn / hết hạn muộn hơn
    if (!cur || (cur.expiresAt && (!g.expiresAt || g.expiresAt > cur.expiresAt))) grants.set(g.key, g);
  };
  for (const k of CORE) add({ key: k, source: "core", expiresAt: null });
  if (t) for (const k of getPreset(t.industry).modules) add({ key: k, source: "industry", expiresAt: null });
  const planActive = !!t && (!t.planExpiresAt || t.planExpiresAt.getTime() > now);
  const plan = getPlan(planActive ? t?.plan : "basic");
  for (const k of plan.includes) add({ key: k, source: "plan", expiresAt: t?.planExpiresAt?.toISOString() ?? null });
  for (const r of rows) {
    if (!r.enabled) continue;
    if (r.expiresAt && r.expiresAt.getTime() <= now) continue;
    add({ key: r.moduleKey, source: (r.source as ModuleGrant["source"]) ?? "manual", expiresAt: r.expiresAt?.toISOString() ?? null });
  }
  const v: Entitlements = { plan: plan.key, planExpiresAt: t?.planExpiresAt?.toISOString() ?? null, planActive, modules: new Set(grants.keys()), grants: [...grants.values()] };
  if (cache.size > 5000) cache.clear();
  cache.set(tid, { v, exp: now + 15_000 });
  return v;
}

/** Quyền thuộc module nào (từ registry) — để chặn API của module chưa mua */
const MODULE_OF = new Map<string, string>(MODULES.flatMap((m) => m.permissions.map((p) => [p.key, m.key] as const)));
export const moduleOfPermission = (perm: string) => MODULE_OF.get(perm.split(":")[0]);
export const moduleName = (key: string) => MODULES.find((m) => m.key === key)?.name ?? key;
