import { eq } from "drizzle-orm";
import { getEntitlements } from "@/lib/services/entitlements";
import { ok, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { getPreset } from "@/modules/presets";

export const GET = withAuth(null, async (_req, ctx) => {
  const [tenant] = await db
    .select({ id: schema.tenants.id, slug: schema.tenants.slug, name: schema.tenants.name, industry: schema.tenants.industry, settings: schema.tenants.settings })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, ctx.tid));
  const ent = await getEntitlements(ctx.tid);
  const preset = getPreset(tenant.industry);
  return ok({
    user: { id: ctx.sub, name: ctx.name, roles: ctx.roles, perms: ctx.perms },
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name, industry: tenant.industry, brand: tenant.settings.brand ?? {} },
    modules: [...ent.modules],
    plan: { key: ent.plan, expiresAt: ent.planExpiresAt },
    grants: ent.grants,
    industry: { key: preset.key, name: preset.name, engine: preset.engine, booking: preset.booking },
    labels: preset.labels,
    impersonatedBy: ctx.imp ?? null,
  });
});
