/**
 * Lõi tạo doanh nghiệp — KHÔNG import "server-only" để dùng chung cho:
 *   - API Super Admin (provision.ts, có kiểm tra quyền + mật khẩu)
 *   - CLI `npm run tenant:new` và khởi tạo tự động trong Docker (scripts/lib/tenant.ts)
 */
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";
import { DEFAULT_ROLES, getPreset } from "@/modules/presets";

export type NewTenant = {
  slug: string;
  name: string;
  industry: string;
  plan?: string;
  owner: { fullName: string; email: string; password: string; phone?: string | null };
  contact?: { phone?: string; email?: string; address?: string };
  /** Tên miền riêng đã trỏ về server (được đánh dấu đã xác minh vì do quản trị viên khai báo) */
  domains?: string[];
};

export const SLUG_RE = /^[a-z0-9][a-z0-9_]{1,39}$/;

export async function createTenant(db: PostgresJsDatabase<typeof schema>, input: NewTenant, passwordHash: string) {
  const preset = getPreset(input.industry);
  return db.transaction(async (tx) => {
    const [t] = await tx
      .insert(schema.tenants)
      .values({
        slug: input.slug,
        name: input.name,
        industry: input.industry,
        ...(input.plan ? { plan: input.plan } : {}),
        settings: {
          brand: { primaryColor: preset.color, tagline: preset.tagline },
          contact: input.contact ?? {},
          company: { legalName: input.name },
          invoice: { prefix: input.slug.replace(/[^a-z]/g, "").slice(0, 2).toUpperCase() || "HD", defaultVatRate: 8 },
          bankAccounts: [],
          misa: { enabled: false, env: "mock" },
        },
      })
      .returning();
    await tx.insert(schema.tenantModules).values(preset.modules.map((m) => ({ tenantId: t.id, moduleKey: m })));
    const [branch] = await tx.insert(schema.branches).values({ tenantId: t.id, name: "Cơ sở chính", phone: input.contact?.phone ?? null, address: input.contact?.address ?? null }).returning();
    const roles = await tx
      .insert(schema.roles)
      .values(DEFAULT_ROLES.map((r) => ({ tenantId: t.id, key: r.key, name: r.name, description: r.description, permissions: r.permissions, isSystem: true })))
      .returning();
    const email = input.owner.email.toLowerCase();
    const [u] = await tx.insert(schema.users).values({ tenantId: t.id, fullName: input.owner.fullName, email, phone: input.owner.phone || null, passwordHash }).returning();
    await tx.insert(schema.userRoles).values({ userId: u.id, roleId: roles.find((r) => r.key === "owner")!.id });
    await tx.insert(schema.employees).values({ tenantId: t.id, branchId: branch.id, userId: u.id, code: "NV001", fullName: input.owner.fullName, email, position: "Chủ doanh nghiệp" });
    for (const [i, d] of (input.domains ?? []).entries()) {
      await tx.insert(schema.tenantDomains).values({ tenantId: t.id, domain: d.toLowerCase(), isPrimary: i === 0, verifiedAt: new Date() });
    }
    return { tenant: t, ownerId: u.id };
  });
}
