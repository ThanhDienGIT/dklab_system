import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm, type DemoAccount } from "./LoginForm";

// Tài khoản demo chỉ hiện khi DEMO_MODE=1 (không bao giờ hiện cho khách thật)
const demo =
  process.env.DEMO_MODE === "1"
    ? [
        { email: "admin@dulichdemo.vn", role: "Chủ doanh nghiệp (toàn quyền)" },
        { email: "letan@dulichdemo.vn", role: "Lễ tân – tiếp nhận đặt chỗ" },
        { email: "ketoan@dulichdemo.vn", role: "Kế toán – hóa đơn, MISA" },
        { email: "hdv@dulichdemo.vn", role: "Nhân viên – chỉ việc được giao" },
      ]
    : null;

export const metadata: Metadata = { title: "Đăng nhập quản trị" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-100 to-cyan-50 p-4">
      <Suspense>
        <LoginForm demo={demo as DemoAccount[] | null} />
      </Suspense>
    </main>
  );
}
