import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { DEMO_SEEDS } from "@/plugins/_seeds";
import { getPreset, INDUSTRY_PRESETS } from "@/modules/presets";
import { siteDemoMode, sitePlugins, TRAVEL_DEMO_SLUG } from "@/site.config";
import { LoginForm, type DemoTenant } from "./LoginForm";

// Danh sách doanh nghiệp + tài khoản demo chỉ có khi DEMO_MODE=1 (không bao giờ hiện cho khách thật).
// Đọc biến môi trường lúc CHẠY (không phải lúc build) để 1 image Docker dùng được cho mọi kiểu triển khai.
async function Login() {
  await connection();
  const only = sitePlugins();
  const shown = (k: string) => INDUSTRY_PRESETS.some((p) => p.key === k) && (!only.length || only.includes(k));
  const demo: DemoTenant[] | null = siteDemoMode()
    ? [
        ...(shown("travel")
          ? [{ slug: TRAVEL_DEMO_SLUG, name: "Du Lịch Demo", industry: "Du lịch", accounts: [
              { email: "admin@dulichdemo.vn", role: "Chủ doanh nghiệp" }, { email: "letan@dulichdemo.vn", role: "Lễ tân" },
              { email: "ketoan@dulichdemo.vn", role: "Kế toán" }, { email: "hdv@dulichdemo.vn", role: "Nhân viên (việc được giao)" },
            ] }]
          : []),
        ...DEMO_SEEDS.filter((x) => shown(x.industry)).map(({ industry, demo: d }) => ({
          slug: d.slug,
          name: d.name,
          industry: getPreset(industry).name,
          accounts: [
            { email: `admin@${d.domainEmail}`, role: "Chủ doanh nghiệp" },
            { email: `letan@${d.domainEmail}`, role: "Lễ tân" },
            { email: `ketoan@${d.domainEmail}`, role: "Kế toán" },
          ],
        })),
      ]
    : null;
  return <LoginForm demo={demo} password={process.env.SEED_ADMIN_PASSWORD || "Admin@123"} />;
}

export const metadata: Metadata = { title: "Đăng nhập quản trị" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-100 to-cyan-50 p-4">
      <Suspense>
        <Login />
      </Suspense>
    </main>
  );
}
