"use client";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button, Field } from "@/components/ui";

export default function PlatformLogin() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_at_top,rgb(234_88_12/0.25),transparent_55%)] p-4">
      <form
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setErr("");
          const r = await fetch("/api/platform/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
          const j = await r.json();
          if (!r.ok) { setErr(j.error ?? "Đăng nhập thất bại"); setLoading(false); return; }
          window.location.href = "/superdklab";
        }}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 text-white"><ShieldCheck size={20} /></span>
          <div><h1 className="font-bold">Quản trị nền tảng</h1><p className="text-xs text-slate-500">Chỉ dành cho Super Admin DKLab</p></div>
        </div>
        <Field required label="Tài khoản"><input className="input" autoComplete="username" value={username} onChange={(e) => setU(e.target.value)} autoFocus /></Field>
        <Field required label="Mật khẩu"><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setP(e.target.value)} /></Field>
        {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{err}</p>}
        <Button className="w-full" loading={loading}>Đăng nhập</Button>
        <p className="text-center text-[11px] text-slate-400">Phiên đăng nhập 8 giờ · Mọi thao tác được ghi nhật ký</p>
      </form>
    </main>
  );
}
