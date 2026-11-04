"use client";
import { ArrowLeft, Ban, CheckCircle2, Globe, KeyRound, LogIn, Puzzle, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { Badge, Button, Field, Modal, Skeleton, useToast } from "@/components/ui";
import { dateTimeVN } from "@/lib/format";
import { getPreset } from "@/modules/presets";
import { MODULES } from "@/modules/registry";
import { errorMessage } from "@/store/api";
import { useDeleteDomainMutation, useImpersonateMutation, useResetPasswordMutation, useSetModulesMutation, useTenantQuery, useUpdateTenantMutation, useVerifyDomainMutation } from "@/store/platform";

const ROLE: Record<string, string> = { owner: "Chủ", manager: "Quản lý", receptionist: "Lễ tân", accountant: "Kế toán", staff: "Nhân viên" };

export default function TenantDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: t, isLoading } = useTenantQuery(id);
  const [update, u] = useUpdateTenantMutation();
  const [setModules, m] = useSetModulesMutation();
  const [verify] = useVerifyDomainMutation();
  const [delDomain] = useDeleteDomainMutation();
  const [imp, setImp] = useState<{ userId?: string; name: string } | null>(null);
  const [reset, setReset] = useState<{ userId: string; name: string } | null>(null);
  const [mods, setMods] = useState<string[] | null>(null);
  const toast = useToast();
  if (isLoading || !t) return <Skeleton rows={8} />;
  const preset = getPreset(t.industry);
  const enabled = mods ?? t.modules.filter((x) => x.enabled).map((x) => x.key);
  const run = async (p: Promise<unknown>, msg: string) => { try { await p; toast(msg); } catch (e) { toast(errorMessage(e), "err"); } };

  return (
    <>
      <Link href="/superdklab" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft size={16} /> Tất cả doanh nghiệp</Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.name} <Badge color={t.status === "active" ? "green" : "red"}>{t.status === "active" ? "Hoạt động" : "Đã khóa"}</Badge></h1>
          <p className="text-sm text-slate-500"><span className="font-mono">{t.slug}</span> · {preset.name} · gói {t.plan}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setImp({ name: "Chủ doanh nghiệp" })}><LogIn size={16} /> Đăng nhập thay</Button>
          <select className="input h-10 w-36" value={t.plan} onChange={(e) => run(update({ id, plan: e.target.value }).unwrap(), "Đã đổi gói")} aria-label="Gói dịch vụ">
            <option value="basic">Basic</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option>
          </select>
          {t.status === "active" ? (
            <Button variant="danger" loading={u.isLoading} onClick={() => confirm(`Khóa ${t.name}? Website và mọi tài khoản sẽ ngừng hoạt động ngay.`) && run(update({ id, status: "suspended" }).unwrap(), "Đã khóa doanh nghiệp")}><Ban size={16} /> Khóa</Button>
          ) : (
            <Button variant="success" loading={u.isLoading} onClick={() => run(update({ id, status: "active" }).unwrap(), "Đã mở khóa")}><CheckCircle2 size={16} /> Mở khóa</Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Users size={17} /> Tài khoản ({t.users.length})</h2>
          <ul className="divide-y">
            {t.users.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <div className="font-medium">{x.fullName} {x.roles.map((r) => <Badge key={r} color={r === "owner" ? "violet" : "blue"}>{ROLE[r] ?? r}</Badge>)} {x.status !== "active" && <Badge color="red">Khóa</Badge>}</div>
                  <div className="text-xs text-slate-500">{x.email ?? x.phone} · {x.lastLoginAt ? `đăng nhập ${dateTimeVN(x.lastLoginAt)}` : "chưa đăng nhập"}</div>
                </div>
                <span className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setReset({ userId: x.id, name: x.fullName })}><KeyRound size={13} /> Đặt lại MK</Button>
                  <Button size="sm" variant="ghost" onClick={() => setImp({ userId: x.id, name: x.fullName })}><LogIn size={13} /> Vào thay</Button>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="mb-1 flex items-center gap-2 font-semibold"><Puzzle size={17} /> Module</h2>
          <p className="mb-2 text-xs text-slate-500">Module lõi luôn bật. Preset ngành {preset.name}: {preset.modules.join(", ")}. Tick để <b>cấp tay</b> (không hết hạn); plugin đã mua / dùng thử giữ nguyên hạn.</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {t.grants.filter((g) => !["core"].includes(g.source)).map((g) => (
              <span key={g.key} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">{g.key} · {g.source}{g.expiresAt ? ` · đến ${new Date(g.expiresAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}` : ""}</span>
            ))}
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {MODULES.map((mod) => (
              <label key={mod.key} className="flex items-start gap-2 rounded-lg border p-2 text-sm">
                <input type="checkbox" className="mt-0.5" disabled={mod.core} checked={mod.core || enabled.includes(mod.key)}
                  onChange={(e) => setMods(e.target.checked ? [...enabled, mod.key] : enabled.filter((k) => k !== mod.key))} />
                <span><b>{mod.name}</b>{mod.core && <span className="text-xs text-slate-400"> · lõi</span>}<span className="block text-xs text-slate-500">{mod.description}</span></span>
              </label>
            ))}
          </div>
          {mods && <Button className="mt-3" loading={m.isLoading} onClick={() => run(setModules({ id, modules: mods }).unwrap().then(() => setMods(null)), "Đã lưu module")}>Lưu module</Button>}
        </section>

        <section className="card p-4 lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Globe size={17} /> Tên miền</h2>
          {!t.domains.length ? <p className="text-sm text-slate-500">Chưa khai báo tên miền riêng (đang dùng subdomain theo mã).</p> : (
            <ul className="divide-y">
              {t.domains.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="font-medium">{d.domain} {d.verifiedAt ? <Badge color="green">Đã xác minh</Badge> : <Badge color="amber">Chưa xác minh</Badge>}</span>
                  <span className="flex gap-1">
                    {d.verifiedAt
                      ? <Button size="sm" variant="ghost" onClick={() => run(verify({ id: d.id, verified: false }).unwrap(), "Đã thu hồi xác minh")}>Thu hồi xác minh</Button>
                      : <Button size="sm" variant="secondary" onClick={() => confirm(`Xác nhận bạn đã kiểm tra ${d.domain} thuộc về ${t.name}?`) && run(verify({ id: d.id, verified: true }).unwrap(), "Đã xác minh thủ công")}>Xác minh thủ công</Button>}
                    <button className="p-1.5 text-slate-400 hover:text-rose-600" aria-label={`Xóa ${d.domain}`} onClick={() => confirm(`Gỡ ${d.domain}?`) && run(delDomain(d.id).unwrap(), "Đã gỡ")}><Trash2 size={15} /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {imp && <ImpersonateModal id={id} target={imp} onClose={() => setImp(null)} />}
      {reset && <ResetModal id={id} target={reset} onClose={() => setReset(null)} />}
    </>
  );
}

function ImpersonateModal({ id, target, onClose }: { id: string; target: { userId?: string; name: string }; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [imp, { isLoading }] = useImpersonateMutation();
  const toast = useToast();
  return (
    <Modal open onClose={onClose} title={`Đăng nhập thay: ${target.name}`}
      footer={<Button loading={isLoading} disabled={reason.trim().length < 5} onClick={async () => {
        try { const r = await imp({ id, userId: target.userId, reason }).unwrap(); window.open(r.redirect, "_blank"); onClose(); } catch (e) { toast(errorMessage(e), "err"); }
      }}>Vào trang quản trị</Button>}>
      <div className="space-y-3 text-sm">
        <p className="rounded-lg bg-amber-50 p-3 text-amber-900">Phiên đăng nhập thay hết hạn sau <b>1 giờ</b>, hiển thị banner cảnh báo và được ghi vào nhật ký của cả nền tảng lẫn doanh nghiệp.</p>
        <Field required label="Lý do (ghi nhật ký)" hint="VD: Khách nhờ cấu hình tài khoản ngân hàng, ticket #123"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus /></Field>
      </div>
    </Modal>
  );
}

function ResetModal({ id, target, onClose }: { id: string; target: { userId: string; name: string }; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [reset, { isLoading }] = useResetPasswordMutation();
  const toast = useToast();
  return (
    <Modal open onClose={onClose} title={`Đặt lại mật khẩu: ${target.name}`}
      footer={<Button loading={isLoading} disabled={pw.length < 8} onClick={async () => { try { await reset({ id, userId: target.userId, password: pw }).unwrap(); toast("Đã đặt lại, mọi phiên cũ bị đăng xuất"); onClose(); } catch (e) { toast(errorMessage(e), "err"); } }}>Đặt lại</Button>}>
      <Field required label="Mật khẩu mới" hint="≥ 8 ký tự, có chữ và số. Tài khoản sẽ bị đăng xuất khỏi mọi thiết bị."><input className="input font-mono" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></Field>
    </Modal>
  );
}
