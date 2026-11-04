import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ApiError, ok, parseBody } from "@/lib/api";
import { platformAudit, withPlatform } from "@/lib/auth/platform";
import { db, schema } from "@/lib/db";
import { invalidateTenant } from "@/lib/services/cache";
import { invalidateAuthCache } from "@/lib/api";
import { getEntitlements, invalidateEntitlements } from "@/lib/services/entitlements";

export const GET = withPlatform<{ id: string }>(async (_req, _ctx, { id }) => {
  const [t] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, id));
  if (!t) throw new ApiError(404, "Không tìm thấy doanh nghiệp");
  const [modules, domains, users] = await Promise.all([
    db.select({ key: schema.tenantModules.moduleKey, enabled: schema.tenantModules.enabled, source: schema.tenantModules.source, expiresAt: schema.tenantModules.expiresAt }).from(schema.tenantModules).where(eq(schema.tenantModules.tenantId, id)),
    db.select().from(schema.tenantDomains).where(eq(schema.tenantDomains.tenantId, id)).orderBy(asc(schema.tenantDomains.createdAt)),
    db
      .select({ id: schema.users.id, fullName: schema.users.fullName, email: schema.users.email, phone: schema.users.phone, status: schema.users.status, lastLoginAt: schema.users.lastLoginAt, roles: sql<string[]>`(select coalesce(array_agg(r.key), '{}') from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = ${schema.users.id})` })
      .from(schema.users)
      .where(eq(schema.users.tenantId, id))
      .orderBy(asc(schema.users.createdAt)),
  ]);
  const { misa: _m, ...settings } = t.settings;
  const ent = await getEntitlements(id);
  return ok({ ...t, settings, modules, domains, users, grants: ent.grants });
});

const Patch = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  plan: z.enum(["basic", "pro", "enterprise"]).optional(),
});

export const PATCH = withPlatform<{ id: string }>(async (req, ctx, { id }) => {
  const b = await parseBody(req, Patch);
  // Super Admin đổi gói thủ công => gói không hết hạn
  const [t] = await db.update(schema.tenants).set({ ...b, ...(b.plan ? { planExpiresAt: null } : {}) }).where(eq(schema.tenants.id, id)).returning({ id: schema.tenants.id });
  if (!t) throw new ApiError(404, "Không tìm thấy doanh nghiệp");
  invalidateTenant();
  invalidateEntitlements(id);
  invalidateAuthCache(); // khóa doanh nghiệp => mọi phiên đăng nhập bị từ chối ngay
  await platformAudit(ctx, b.status === "suspended" ? "tenant.suspend" : b.status === "active" ? "tenant.activate" : "tenant.update", id, b);
  return ok(t);
});
