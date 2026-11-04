"use client";
import { Building2, CalendarCheck, Plus, Search, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Empty, Field, Modal, PageHeader, Skeleton, Stat, useToast } from "@/components/ui";
import { dateVN, vnd } from "@/lib/format";
import { INDUSTRY_PRESETS, getPreset } from "@/modules/presets";
import { errorMessage } from "@/store/api";
import { useCreateTenantMutation, useStatsQuery, useTenantsQuery } from "@/store/platform";

export default function PlatformHome() {
  const { data: stats } = useStatsQuery();
  const { data: tenants, isLoading } = useTenantsQuery();
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("all");
  const [creating, setCreating] = useState(false);
  const list = (tenants ?? []).filter((t) => (industry === "all" || t.industry === industry) && (!q || `${t.name} ${t.slug} ${t.domains.join(" ")}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <PageHeader title="Toàn bộ nền tảng" desc="Quản lý mọi doanh nghiệp / website đang chạy trên DKLab" actions={<Button onClick={() => setCreating(true)}><Plus size={16} /> Tạo doanh nghiệp</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Doanh nghiệp" value={stats?.tenants.total ?? "…"} sub={`${stats?.tenants.active ?? 0} hoạt động · +${stats?.tenants.new30 ?? 0} trong 30 ngày`} icon={<Building2 size={16} />} />
        <Stat label="Đặt chỗ 30 ngày" value={stats?.bookings30 ?? "…"} icon={<CalendarCheck size={16} />} />
        <Stat label="Doanh thu đã thu 30 ngày" value={vnd(stats?.revenue30 ?? 0)} sub="Tổng các doanh nghiệp" icon={<Wallet size={16} />} />
        <Stat label="Tài khoản người dùng" value={stats?.users ?? "…"} icon={<Users size={16} />} />
      </div>
      {!!stats?.byIndustry.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {stats.byIndustry.map((x) => <span key={x.industry} className="rounded-full bg-white px-3 py-1 text-xs shadow-sm ring-1 ring-slate-200">{getPreset(x.industry).name}: <b>{x.n}</b></span>)}
        </div>
      )}

      <div className="mt-6 mb-3 flex flex-col gap-2 sm:flex-row">
        <label className="relative sm:w-80">
          <span className="sr-only">Tìm doanh nghiệp</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Tìm tên, mã, tên miền…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="input sm:w-56" value={industry} onChange={(e) => setIndustry(e.target.value)} aria-label="Lọc theo ngành">
          <option value="all">Tất cả ngành</option>
          {INDUSTRY_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
        </select>
      </div>
      {isLoading ? <Skeleton /> : !list.length ? <Empty>Không có doanh nghiệp phù hợp.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-2.5">Doanh nghiệp</th><th>Ngành</th><th>Tên miền</th><th className="text-right">Đặt chỗ 30N</th><th className="text-right">Đã thu 30N</th><th className="pl-4">Tài khoản</th><th>Trạng thái</th><th>Tạo</th></tr></thead>
            <tbody className="divide-y">
              {list.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5"><Link href={`/superdklab/tenants/${t.id}`} className="font-semibold text-brand hover:underline">{t.name}</Link><div className="font-mono text-xs text-slate-500">{t.slug}</div></td>
                  <td>{getPreset(t.industry).name}</td>
                  <td className="max-w-48 truncate text-xs text-slate-600">{t.domains.join(", ") || "—"}</td>
                  <td className="text-right tabular-nums">{t.bookings30}</td>
                  <td className="text-right tabular-nums">{vnd(t.revenue30)}</td>
                  <td className="pl-4">{t.users}</td>
                  <td><Badge color={t.status === "active" ? "green" : "red"}>{t.status === "active" ? "Hoạt động" : "Đã khóa"}</Badge></td>
                  <td className="text-xs text-slate-500">{dateVN(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && <CreateTenant onClose={() => setCreating(false)} />}
    </>
  );
}

function CreateTenant({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ name: "", slug: "", industry: INDUSTRY_PRESETS[0]?.key ?? "", fullName: "", email: "", phone: "", password: "", address: "" });
  const [create, { isLoading }] = useCreateTenantMutation();
  const toast = useToast();
  const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const missing = [!f.name && "Tên", !f.slug && "Mã", !f.fullName && "Họ tên chủ", !f.email && "Email chủ", f.password.length < 8 && "Mật khẩu ≥ 8"].filter(Boolean);
  const preset = INDUSTRY_PRESETS.find((p) => p.key === f.industry);
  return (
    <Modal open onClose={onClose} wide title="Tạo doanh nghiệp mới"
      footer={<>
        {missing.length > 0 && <span className="mr-auto self-center text-xs text-slate-500">Còn thiếu: {missing.join(", ")}</span>}
        <Button loading={isLoading} disabled={missing.length > 0} onClick={async () => {
          try {
            const r = await create({ slug: f.slug, name: f.name, industry: f.industry, owner: { fullName: f.fullName, email: f.email, phone: f.phone, password: f.password }, contact: { phone: f.phone, address: f.address } }).unwrap();
            toast(`Đã tạo ${r.slug}`);
            onClose();
          } catch (e) { toast(errorMessage(e), "err"); }
        }}>Tạo doanh nghiệp</Button>
      </>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field required label="Tên doanh nghiệp"><input className="input" value={f.name} onChange={(e) => { set("name", e.target.value); if (!f.slug || f.slug === slugify(f.name)) set("slug", slugify(e.target.value)); }} /></Field>
        <Field required label="Mã (slug)" hint={`Subdomain: ${f.slug.replace(/_/g, "-") || "ma-doanh-nghiep"}.<ROOT_DOMAIN>`}><input className="input font-mono" value={f.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))} /></Field>
        <Field required label="Ngành" className="sm:col-span-2">
          <select className="input" value={f.industry} onChange={(e) => set("industry", e.target.value)}>
            {INDUSTRY_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
          </select>
        </Field>
        {preset && <p className="-mt-1 text-xs text-slate-500 sm:col-span-2">{preset.description}. Module bật sẵn: {preset.modules.join(", ")}.</p>}
        <Field required label="Họ tên chủ doanh nghiệp"><input className="input" value={f.fullName} onChange={(e) => set("fullName", e.target.value)} /></Field>
        <Field required label="Email đăng nhập của chủ"><input className="input" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="SĐT"><input className="input" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field required label="Mật khẩu ban đầu" hint="≥ 8 ký tự, có chữ và số. Gửi riêng cho khách, khuyên đổi ngay.">
          <div className="flex gap-2">
            <input className="input font-mono" value={f.password} onChange={(e) => set("password", e.target.value)} />
            <Button type="button" variant="secondary" size="sm" onClick={() => {
              const a = new Uint32Array(3);
              crypto.getRandomValues(a);
              set("password", `Dk${Array.from(a, (x) => x.toString(36)).join("").slice(0, 10)}9`);
            }}>Sinh</Button>
          </div>
        </Field>
        <Field label="Địa chỉ" className="sm:col-span-2"><input className="input" value={f.address} onChange={(e) => set("address", e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
