import "server-only";

export function appSecret(): string {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("APP_SECRET phải có ít nhất 32 ký tự");
    return "dev-only-secret-change-me-please-0123456789";
  }
  return s;
}

export const DEFAULT_TENANT = process.env.DEFAULT_TENANT || "dulich_demo";
export const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "dklab.vn";
