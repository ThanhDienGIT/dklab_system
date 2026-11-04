/**
 * Cấu hình triển khai của NHÁNH / bản build này (biến môi trường luôn được ưu tiên hơn).
 *
 *   plugins       Ngành được đóng gói. [] = tất cả.            (env: PLUGINS=spa,cafe)
 *   defaultTenant Doanh nghiệp hiển thị khi truy cập bằng domain chung
 *                 (localhost, IP, *.vercel.app, ROOT_DOMAIN).    (env: DEFAULT_TENANT)
 *   demoMode      Hiện tài khoản mẫu ở /login, cho đổi tenant bằng ?tenant=  (env: DEMO_MODE=1|0)
 *
 * Các nhánh demo/<ngành> chỉ khác nhánh chính ở đúng file này.
 */
export const SITE = {
  plugins: ["cafe"] as string[],
  defaultTenant: "cafe_demo",
  demoMode: true,
};

export const siteDefaultTenant = () => process.env.DEFAULT_TENANT || SITE.defaultTenant || "dulich_demo";
export const siteDemoMode = () => (process.env.DEMO_MODE ? process.env.DEMO_MODE === "1" : SITE.demoMode);
export const sitePlugins = () => {
  const env = (process.env.PLUGINS ?? "").split(",").map((s) => s.trim()).filter((s) => s && s !== "all");
  return env.length ? env : SITE.plugins;
};
/** Slug cố định của doanh nghiệp demo ngành du lịch */
export const TRAVEL_DEMO_SLUG = "dulich_demo";
