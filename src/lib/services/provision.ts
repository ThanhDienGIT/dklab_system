import "server-only";
import { eq } from "drizzle-orm";
import { ApiError } from "../api";
import { hashPassword, validatePasswordStrength } from "../auth/password";
import { db, schema } from "../db";
import { DEFAULT_ROLES, getPreset, INDUSTRY_PRESETS } from "@/modules/presets";

export type NewTenant = {
  slug: string;
  name: string;
  industry: string;
  owner: { fullName: string; email: string; password: string; phone?: string | null };
  contact?: { phone?: string; email?: string; address?: string };
};

/** Tạo doanh nghiệp mới từ preset ngành: bật module, tạo vai trò mặc định, chi nhánh, tài khoản Chủ. */
export async function provisionTenant(input: NewTenant) {
  if (!INDUSTRY_PRESETS.some((p) => p.key === input.industry)) throw new ApiError(422, "Ngành không hợp lệ");
  const weak = validatePasswordStrength(input.owner.password);
  if (weak) throw new ApiError(422, `Mật khẩu chủ doanh nghiệp: ${weak}`);
  const [dup] = await db.select({ id: schema.tenants.id }).from(schema.tenants).where(eq(schema.tenants.slug, input.slug));
  if (dup) throw new ApiError(409, "Mã doanh nghiệp (slug) đã tồn tại");
  const preset = getPreset(input.industry);
  const pw = await hashPassword(input.owner.password);
  return db.transaction(async (tx) => {
    const [t] = await tx
      .insert(schema.tenants)
      .values({
        slug: input.slug,
        name: input.name,
        industry: input.industry,
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
    const [u] = await tx
      .insert(schema.users)
      .values({ tenantId: t.id, fullName: input.owner.fullName, email: input.owner.email.toLowerCase(), phone: input.owner.phone || null, passwordHash: pw })
      .returning();
    await tx.insert(schema.userRoles).values({ userId: u.id, roleId: roles.find((r) => r.key === "owner")!.id });
    await tx.insert(schema.employees).values({ tenantId: t.id, branchId: branch.id, userId: u.id, code: "NV001", fullName: input.owner.fullName, email: input.owner.email.toLowerCase(), position: "Chủ doanh nghiệp" });
    return { tenant: t, ownerId: u.id };
  });
}
