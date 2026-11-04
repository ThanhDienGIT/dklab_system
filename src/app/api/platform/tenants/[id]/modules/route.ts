import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError, ok, parseBody } from "@/lib/api";
import { platformAudit, withPlatform } from "@/lib/auth/platform";
import { db, schema } from "@/lib/db";
import { MODULES } from "@/modules/registry";

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
  await db.transaction(async (tx) => {
    await tx.delete(schema.tenantModules).where(and(eq(schema.tenantModules.tenantId, id)));
    await tx.insert(schema.tenantModules).values(want.map((m) => ({ tenantId: id, moduleKey: m, enabled: true })));
  });
  await platformAudit(ctx, "tenant.modules", id, { modules: want });
  return ok({ modules: want });
});
