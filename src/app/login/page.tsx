import type { Metadata } from "next";
import { Suspense } from "react";
import { DEMO_SEEDS } from "@/plugins/_seeds";
import { getPreset } from "@/modules/presets";
import { LoginForm, type DemoTenant } from "./LoginForm";

// Danh sách doanh nghiệp + tài khoản demo chỉ có khi DEMO_MODE=1 (không bao giờ hiện cho khách thật)
const demo: DemoTenant[] | null =
  process.env.DEMO_MODE === "1"
    ? [
        { slug: process.env.DEFAULT_TENANT || "dulich_demo", name: "Du Lịch Demo", industry: "Du lịch", accounts: [
          { email: "admin@dulichdemo.vn", role: "Chủ doanh nghiệp" }, { email: "letan@dulichdemo.vn", role: "Lễ tân" },
          { email: "ketoan@dulichdemo.vn", role: "Kế toán" }, { email: "hdv@dulichdemo.vn", role: "Nhân viên (việc được giao)" },
        ] },
        ...DEMO_SEEDS.map(({ industry, demo: d }) => ({
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

export const metadata: Metadata = { title: "Đăng nhập quản trị" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-100 to-cyan-50 p-4">
      <Suspense>
        <LoginForm demo={demo} password={process.env.SEED_ADMIN_PASSWORD || "Admin@123"} />
      </Suspense>
    </main>
  );
}
