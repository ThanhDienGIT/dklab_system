import "server-only";
import { siteDefaultTenant, siteDemoMode } from "@/site.config";

export function appSecret(): string {
  const s = process.env.APP_SECRET;
  if (process.env.NODE_ENV === "production" && s && /change-me/i.test(s)) throw new Error("APP_SECRET đang dùng giá trị mẫu, hãy đổi chuỗi ngẫu nhiên");
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("APP_SECRET phải có ít nhất 32 ký tự");
    return "dev-only-secret-change-me-please-0123456789";
  }
  return s;
}

export const DEFAULT_TENANT = siteDefaultTenant();
export const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "dklab.vn";

export const DEMO_MODE = siteDemoMode();
