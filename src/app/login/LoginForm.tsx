"use client";
import { Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Field } from "@/components/ui";

export type DemoAccount = { email: string; role: string };
export type DemoTenant = { slug: string; name: string; industry: string; accounts: DemoAccount[] };

export function LoginForm({ demo, password: demoPw }: { demo: DemoTenant[] | null; password: string }) {
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
      {demo && demo.length > 0 && (() => {
        const cur = demo.find((d) => d.slug === sp.get("tenant")) ?? demo[0];
        return (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 text-xs text-slate-600">
            <label className="mb-2 block font-medium">
              Doanh nghiệp demo
              <select
                className="input mt-1"
                value={cur.slug}
                onChange={(e) => { window.location.href = `/login?tenant=${encodeURIComponent(e.target.value)}`; }}
              >
                {demo.map((d) => <option key={d.slug} value={d.slug}>{d.name} · {d.industry}</option>)}
              </select>
            </label>
            <p className="mb-1 font-medium">Tài khoản (mật khẩu: {demoPw})</p>
            <ul className="space-y-1">
              {cur.accounts.map((d) => (
                <li key={d.email}>
                  <button type="button" className="text-brand hover:underline" onClick={() => { setIdentifier(d.email); setPassword(demoPw); }}>{d.email}</button> – {d.role}
                </li>
              ))}
            </ul>
            <a href={`/?tenant=${encodeURIComponent(cur.slug)}`} className="mt-2 inline-block text-sky-700 underline">Xem website {cur.name}</a>
          </div>
        );
      })()}
    </div>
  );
}
