import "server-only";
import { eq } from "drizzle-orm";
import { ApiError } from "../api";
import { hashPassword, validatePasswordStrength } from "../auth/password";
import { db, schema } from "../db";
import { INDUSTRY_PRESETS } from "@/modules/presets";
import { createTenant, type NewTenant } from "./provision-core";

export type { NewTenant } from "./provision-core";

/** Tạo doanh nghiệp mới từ preset ngành: bật module, tạo vai trò mặc định, chi nhánh, tài khoản Chủ. */
export async function provisionTenant(input: NewTenant) {
  if (!INDUSTRY_PRESETS.some((p) => p.key === input.industry)) throw new ApiError(422, "Ngành không hợp lệ");
  const weak = validatePasswordStrength(input.owner.password);
  if (weak) throw new ApiError(422, `Mật khẩu chủ doanh nghiệp: ${weak}`);
  const [dup] = await db.select({ id: schema.tenants.id }).from(schema.tenants).where(eq(schema.tenants.slug, input.slug));
  if (dup) throw new ApiError(409, "Mã doanh nghiệp (slug) đã tồn tại");
  return createTenant(db, input, await hashPassword(input.owner.password));
}
