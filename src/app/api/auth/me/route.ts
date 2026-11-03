import { and, eq } from "drizzle-orm";
import { ok, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { getPreset } from "@/modules/presets";

export const GET = withAuth(null, async (_req, ctx) => {
  const [tenant] = await db
    .select({ id: schema.tenants.id, slug: schema.tenants.slug, name: schema.tenants.name, industry: schema.tenants.industry, settings: schema.tenants.settings })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, ctx.tid));
  const mods = await db
    .select({ key: schema.tenantModules.moduleKey })
    .from(schema.tenantModules)
    .where(and(eq(schema.tenantModules.tenantId, ctx.tid), eq(schema.tenantModules.enabled, true)));
  const preset = getPreset(tenant.industry);
  return ok({
    user: { id: ctx.sub, name: ctx.name, roles: ctx.roles, perms: ctx.perms },
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name, industry: tenant.industry, brand: tenant.settings.brand ?? {} },
    modules: mods.map((m) => m.key),
    labels: { booking: preset.bookingLabel, resource: preset.resourceLabel },
  });
});
