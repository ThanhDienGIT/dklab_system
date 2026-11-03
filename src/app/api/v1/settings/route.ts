import { eq } from "drizzle-orm";
import { z } from "zod";
import { audit, ok, parseBody, withAuth } from "@/lib/api";
import { encrypt } from "@/lib/crypto";
import { db, schema } from "@/lib/db";
import { invalidateTenant } from "@/lib/services/cache";
import { findBank } from "@/lib/payments/vietqr";
import { isAllowedMisaUrl } from "@/lib/einvoice/misa";
import { hexColor, httpsUrl } from "@/lib/validators";

const s = (max = 300) => z.string().trim().max(max).optional();

const Body = z.object({
  name: z.string().trim().min(2).max(120),
  brand: z.object({ primaryColor: hexColor.optional(), logoUrl: httpsUrl.optional(), tagline: s(200), heroImage: httpsUrl.optional() }).default({}),
  contact: z.object({ phone: s(30), hotline: s(30), email: s(120), address: s(300), zalo: s(60) }).default({}),
  company: z.object({ legalName: s(200), taxCode: s(20), address: s(300) }).default({}),
  invoice: z.object({ prefix: z.string().trim().regex(/^[A-Z0-9]{0,6}$/, "Tiền tố chỉ gồm A-Z, 0-9 (≤6)").optional(), defaultVatRate: z.coerce.number().int().optional() }).default({}),
  bankAccounts: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        bankBin: z.string().regex(/^\d{6}$/, "Chọn ngân hàng"),
        accountNumber: z.string().trim().regex(/^[0-9A-Za-z]{4,19}$/, "Số tài khoản không hợp lệ"),
        accountName: z.string().trim().min(2).max(120),
        isDefault: z.boolean().optional(),
      }),
    )
    .max(10)
    .default([]),
  misa: z
    .object({
      enabled: z.boolean(),
      env: z.enum(["mock", "test", "live"]),
      appId: s(200),
      taxCode: s(20),
      username: s(120),
      /** Bỏ trống = giữ mật khẩu cũ */
      password: s(200),
      invSeries: s(20),
      invoiceTemplateId: s(100),
      withCode: z.boolean().optional(),
      baseUrl: z
        .string()
        .trim()
        .max(300)
        .refine((v) => v === "" || isAllowedMisaUrl(v), "Base URL MISA chỉ chấp nhận https://*.meinvoice.vn")
        .optional(),
    })
    .optional(),
});

/**
 * Đổi nơi gửi / tài khoản MISA (env, baseUrl, appId, MST, username) mà không nhập lại mật khẩu
 * => xóa mật khẩu cũ. Chặn kiểu tấn công đổi đích đến để server gửi mật khẩu đã lưu cho kẻ xấu.
 */
function keepPassword(prev: schema.MisaConfig | undefined, next: Partial<schema.MisaConfig>) {
  if (!prev?.passwordEnc) return undefined;
  const same = (k: keyof schema.MisaConfig) => (prev[k] || "") === (next[k] || "");
  return same("env") && same("baseUrl") && same("appId") && same("taxCode") && same("username") ? prev.passwordEnc : undefined;
}

function redact(settings: schema.TenantSettings) {
  const { misa, ...rest } = settings;
  return { ...rest, misa: misa ? { ...misa, passwordEnc: undefined, hasPassword: !!misa.passwordEnc } : undefined };
}

export const GET = withAuth("settings.manage", async (_req, ctx) => {
  const [t] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, ctx.tid));
  return ok({ name: t.name, slug: t.slug, industry: t.industry, settings: redact(t.settings) });
});

export const PUT = withAuth("settings.manage", async (req, ctx) => {
  const b = await parseBody(req, Body);
  const [t] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, ctx.tid));
  const prev = t.settings;
  const { password, ...misaRest } = b.misa ?? { enabled: false, env: "mock" as const };
  const settings: schema.TenantSettings = {
    ...prev,
    brand: b.brand,
    contact: b.contact,
    company: b.company,
    invoice: b.invoice,
    bankAccounts: b.bankAccounts.map((a, i) => ({
      ...a,
      bankName: findBank(a.bankBin)?.short ?? a.bankBin,
      isDefault: a.isDefault ?? i === 0,
    })),
    misa: { ...misaRest, baseUrl: misaRest.baseUrl || undefined, passwordEnc: password ? encrypt(password) : keepPassword(prev.misa, misaRest) },
  };
  await db.update(schema.tenants).set({ name: b.name, settings }).where(eq(schema.tenants.id, ctx.tid));
  invalidateTenant();
  await audit(ctx, "settings.update", "tenant", ctx.tid, { misaEnv: settings.misa?.env, banks: settings.bankAccounts?.length });
  return ok({ name: b.name, settings: redact(settings) });
});
