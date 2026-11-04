"use client";
import { useState } from "react";
import { Button, Field, PageHeader, useToast } from "@/components/ui";
import { errorMessage } from "@/store/api";
import { useChangePasswordMutation, usePMe } from "@/store/platform";

export default function PlatformAccount() {
  const { data: me } = usePMe();
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [change, { isLoading }] = useChangePasswordMutation();
  const toast = useToast();
  const mismatch = f.confirm && f.next !== f.confirm;
  return (
    <>
      <PageHeader title="Tài khoản Super Admin" desc={`Đang đăng nhập: ${me?.username ?? ""}`} />
      <div className="card max-w-md space-y-3 p-5">
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Mật khẩu mặc định khi cài đặt cần được đổi ngay. Đổi mật khẩu sẽ đăng xuất mọi phiên Super Admin khác.</p>
        <Field required label="Mật khẩu hiện tại"><input className="input" type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></Field>
        <Field required label="Mật khẩu mới" hint="≥ 10 ký tự, có chữ và số"><input className="input" type="password" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></Field>
        <Field required label="Nhập lại mật khẩu mới" error={mismatch ? "Không khớp" : undefined}><input className="input" type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} /></Field>
        <Button loading={isLoading} disabled={!f.current || f.next.length < 10 || f.next !== f.confirm} onClick={async () => {
          try { await change({ current: f.current, next: f.next }).unwrap(); toast("Đã đổi mật khẩu"); setF({ current: "", next: "", confirm: "" }); } catch (e) { toast(errorMessage(e), "err"); }
        }}>Đổi mật khẩu</Button>
      </div>
    </>
  );
}
