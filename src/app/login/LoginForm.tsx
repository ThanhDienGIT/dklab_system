"use client";
import { Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Field } from "@/components/ui";

const DEMO = [
  { email: "admin@dulichdemo.vn", role: "Chủ doanh nghiệp (toàn quyền)" },
  { email: "letan@dulichdemo.vn", role: "Lễ tân – tiếp nhận đặt chỗ" },
  { email: "ketoan@dulichdemo.vn", role: "Kế toán – hóa đơn, MISA" },
  { email: "hdv@dulichdemo.vn", role: "Nhân viên – chỉ việc được giao" },
];

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier, password }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Đăng nhập thất bại");
      const next = sp.get("next");
      router.replace(next && next.startsWith("/admin") ? next : "/admin");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={submit} className="card space-y-4 p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
            <Lock size={18} />
          </span>
          <div>
            <h1 className="font-semibold">Đăng nhập quản trị</h1>
            <p className="text-xs text-slate-500">Dành cho nhân viên doanh nghiệp</p>
          </div>
        </div>
        <Field label="Email hoặc số điện thoại">
          <input className="input" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoFocus />
        </Field>
        <Field label="Mật khẩu">
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <Button className="w-full" loading={loading}>
          Đăng nhập
        </Button>
      </form>
      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 text-xs text-slate-600">
        <p className="mb-2 font-medium">Tài khoản demo (mật khẩu: Admin@123)</p>
        <ul className="space-y-1">
          {DEMO.map((d) => (
            <li key={d.email}>
              <button type="button" className="text-brand hover:underline" onClick={() => { setIdentifier(d.email); setPassword("Admin@123"); }}>
                {d.email}
              </button>{" "}
              – {d.role}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
