/**
 * Tạo doanh nghiệp (tenant) từ dòng lệnh hoặc biến môi trường — dùng cho triển khai 1 ngành cụ thể.
 * Idempotent: slug đã tồn tại thì bỏ qua (không ghi đè mật khẩu / dữ liệu).
 */
import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../src/lib/db/schema";
import { INDUSTRY_PRESETS } from "../../src/modules/presets";
import { PLANS } from "../../src/modules/plans";
import { createTenant, SLUG_RE, type NewTenant } from "../../src/lib/services/provision-core";

export type TenantOpts = {
  slug: string;
  name: string;
  industry: string;
  plan?: string;
  ownerName?: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  domains?: string[];
};

export function validateTenant(o: Partial<TenantOpts>): string[] {
  const err: string[] = [];
  const industries = INDUSTRY_PRESETS.map((p) => p.key);
  if (!o.slug || !SLUG_RE.test(o.slug)) err.push("slug: 2–40 ký tự a-z, 0-9, _ (vd spa_hoasen)");
  if (!o.name) err.push("name: tên doanh nghiệp");
  if (!o.industry || !industries.includes(o.industry)) err.push(`industry: một trong ${industries.join(", ")}`);
  if (o.plan && !PLANS.some((p) => p.key === o.plan)) err.push(`plan: một trong ${PLANS.map((p) => p.key).join(", ")}`);
  if (!o.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) err.push("email: email đăng nhập của chủ");
  if (!o.password || o.password.length < 8 || !/[A-Za-z]/.test(o.password) || !/\d/.test(o.password)) err.push("password: ≥ 8 ký tự, có chữ và số");
  for (const d of o.domains ?? []) if (!/^(?=.{4,253}$)([a-z0-9-]+\.)+[a-z]{2,}$/i.test(d)) err.push(`domain không hợp lệ: ${d}`);
  return err;
}

export async function ensureTenant(db: PostgresJsDatabase<typeof schema>, o: TenantOpts) {
  const errors = validateTenant(o);
  if (errors.length) throw new Error(`Thông tin doanh nghiệp chưa hợp lệ:\n  - ${errors.join("\n  - ")}`);
  const [exists] = await db.select({ id: schema.tenants.id }).from(schema.tenants).where(eq(schema.tenants.slug, o.slug));
  if (exists) {
    console.log(`✓ Doanh nghiệp "${o.slug}" đã tồn tại, bỏ qua`);
    return false;
  }
  const input: NewTenant = {
    slug: o.slug,
    name: o.name,
    industry: o.industry,
    plan: o.plan,
    owner: { fullName: o.ownerName || "Chủ doanh nghiệp", email: o.email, password: o.password, phone: o.phone || null },
    contact: { phone: o.phone, email: o.email, address: o.address },
    domains: o.domains,
  };
  await createTenant(db, input, await hash(o.password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }));
  console.log(`✓ Đã tạo doanh nghiệp "${o.slug}" (${o.industry}). Chủ đăng nhập: ${o.email.toLowerCase()} tại /login${o.domains?.length ? ` · domain: ${o.domains.join(", ")}` : ""}`);
  return true;
}

/** Đọc TENANT_* / OWNER_* từ môi trường (Docker, VPS). Trả về null nếu không khai báo TENANT_SLUG. */
export function tenantFromEnv(env = process.env): TenantOpts | null {
  if (!env.TENANT_SLUG) return null;
  return {
    slug: env.TENANT_SLUG,
    name: env.TENANT_NAME || env.TENANT_SLUG,
    industry: env.TENANT_INDUSTRY || "",
    plan: env.TENANT_PLAN || undefined,
    ownerName: env.OWNER_NAME,
    email: env.OWNER_EMAIL || "",
    password: env.OWNER_PASSWORD || "",
    phone: env.OWNER_PHONE,
    address: env.TENANT_ADDRESS,
    domains: (env.TENANT_DOMAINS || "").split(",").map((s) => s.trim()).filter(Boolean),
  };
}
