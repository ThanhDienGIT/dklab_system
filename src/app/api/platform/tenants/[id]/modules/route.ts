import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError, ok, parseBody } from "@/lib/api";
import { platformAudit, withPlatform } from "@/lib/auth/platform";
import { db, schema } from "@/lib/db";
import { MODULES } from "@/modules/registry";
import { invalidateEntitlements } from "@/lib/services/entitlements";

const Body = z.object({ modules: z.array(z.string()).max(50) });

/** Bật / tắt module cho doanh nghiệp (module lõi luôn bật) */
export const PUT = withPlatform<{ id: string }>(async (req, ctx, { id }) => {
  const { modules } = await parseBody(req, Body);
  const known = new Set(MODULES.map((m) => m.key));
  const bad = modules.filter((m) => !known.has(m));
  if (bad.length) throw new ApiError(422, `Module không tồn tại: ${bad.join(", ")}`);
  const core = MODULES.filter((m) => m.core).map((m) => m.key);
  const want = [...new Set([...core, ...modules])];
  const [t] = await db.select({ id: schema.tenants.id }).from(schema.tenants).where(eq(schema.tenants.id, id));
  if (!t) throw new ApiError(404, "Không tìm thấy doanh nghiệp");
  const M = schema.tenantModules;
  await db.transaction(async (tx) => {
    // Gỡ các module cấp tay / theo ngành không còn được chọn (giữ nguyên plugin đã mua & dùng thử)
    const rows = await tx.select().from(M).where(eq(M.tenantId, id));
    for (const r of rows)
      if (!want.includes(r.moduleKey) && (r.source === "manual" || r.source === "industry")) await tx.delete(M).where(and(eq(M.tenantId, id), eq(M.moduleKey, r.moduleKey)));
    for (const k of want)
      if (!rows.some((r) => r.moduleKey === k)) await tx.insert(M).values({ tenantId: id, moduleKey: k, enabled: true, source: "manual" });
  });
  invalidateEntitlements(id);
  await platformAudit(ctx, "tenant.modules", id, { modules: want });
  return ok({ modules: want });
});
