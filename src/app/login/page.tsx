import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Đăng nhập quản trị" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-100 to-cyan-50 p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
