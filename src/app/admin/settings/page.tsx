"use client";
import { Globe, Landmark, Plus, Receipt, Trash2 } from "lucide-react";
import { useState } from "react";
import { QR } from "@/components/QR";
import { Badge, Button, Field, PageHeader, Skeleton, useToast } from "@/components/ui";
import { BANKS, buildVietQR } from "@/lib/payments/vietqr";
import { errorMessage, useAddDomainMutation, useDeleteDomainMutation, useVerifyDomainMutation, useDomainsQuery, useMisaTestMutation, useSaveSettingsMutation, useSettingsQuery } from "@/store/api";
import type { BankAccount, MisaSettings, SettingsData } from "@/store/types";

type S = SettingsData["settings"];

export default function SettingsPage() {
  const { data, isLoading } = useSettingsQuery();
  if (isLoading || !data) return <Skeleton rows={8} />;
  return <SettingsForm data={data} />;
}

function SettingsForm({ data }: { data: SettingsData }) {
  const [name, setName] = useState(data.name);
  const [s, setS] = useState<S>(data.settings);
  const [misaPassword, setMisaPassword] = useState("");
  const [save, { isLoading: saving }] = useSaveSettingsMutation();
  const [test, testState] = useMisaTestMutation();
  const toast = useToast();

  const sec = <K extends keyof S>(k: K, field: string) => ({
    value: ((s[k] as Record<string, unknown> | undefined)?.[field] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setS((p) => ({ ...p, [k]: { ...(p[k] as object), [field]: e.target.value } })),
  });
  const misa: MisaSettings = s.misa ?? { enabled: false, env: "mock" };
  const setMisa = (patch: Partial<MisaSettings>) => setS((p) => ({ ...p, misa: { ...misa, ...patch } }));
  const banks = s.bankAccounts ?? [];
  const setBank = (i: number, patch: Partial<BankAccount>) => setS((p) => ({ ...p, bankAccounts: banks.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));

  async function submit() {
    try {
      const { hasPassword: _h, ...m } = misa;
      await save({
        name,
        brand: s.brand ?? {}, contact: s.contact ?? {}, company: s.company ?? {},
        invoice: { prefix: s.invoice?.prefix, defaultVatRate: Number(s.invoice?.defaultVatRate ?? 8) },
        bankAccounts: banks,
        misa: { ...m, password: misaPassword || undefined },
      }).unwrap();
      setMisaPassword("");
      toast("Đã lưu cài đặt");
    } catch (e) { toast(errorMessage(e), "err"); }
  }

  let preview = "";
  try { if (banks[0]?.bankBin && banks[0]?.accountNumber) preview = buildVietQR({ bankBin: banks[0].bankBin, accountNumber: banks[0].accountNumber, amount: 10000, description: "TEST QR" }); } catch {}

  return (
    <>
      <PageHeader title="Cài đặt doanh nghiệp" desc={`Mã tenant: ${data.slug} · Ngành: ${data.industry}`} actions={<Button loading={saving} onClick={submit}>Lưu thay đổi</Button>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card space-y-3 p-4">
          <h2 className="font-semibold">Thông tin & thương hiệu</h2>
          <Field label="Tên hiển thị"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Tên pháp lý (trên hóa đơn)"><input className="input" {...sec("company", "legalName")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mã số thuế"><input className="input" {...sec("company", "taxCode")} /></Field>
            <Field label="Màu thương hiệu"><input className="input h-10 p-1" type="color" {...sec("brand", "primaryColor")} /></Field>
          </div>
          <Field label="Địa chỉ công ty"><input className="input" {...sec("company", "address")} /></Field>
          <Field label="Slogan"><input className="input" {...sec("brand", "tagline")} /></Field>
          <Field label="Ảnh banner trang chủ (URL)"><input className="input" {...sec("brand", "heroImage")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SĐT"><input className="input" {...sec("contact", "phone")} /></Field>
            <Field label="Hotline"><input className="input" {...sec("contact", "hotline")} /></Field>
            <Field label="Email"><input className="input" {...sec("contact", "email")} /></Field>
            <Field label="Zalo"><input className="input" {...sec("contact", "zalo")} /></Field>
          </div>
          <Field label="Địa chỉ liên hệ"><input className="input" {...sec("contact", "address")} /></Field>
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="flex items-center gap-2 font-semibold"><Landmark size={17} /> Tài khoản nhận tiền (VietQR)</h2>
          <p className="text-xs text-slate-500">Mã QR trên hóa đơn sinh theo chuẩn VietQR/NAPAS, quét được bằng mọi app ngân hàng, tự điền số tiền + nội dung để đối soát.</p>
          {banks.map((b, i) => (
            <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
              <Field label="Ngân hàng">
                <select className="input" value={b.bankBin} onChange={(e) => setBank(i, { bankBin: e.target.value })}>
                  <option value="">— Chọn —</option>
                  {BANKS.map((x) => <option key={x.bin} value={x.bin}>{x.short} – {x.name}</option>)}
                </select>
              </Field>
              <Field label="Số tài khoản"><input className="input" value={b.accountNumber} onChange={(e) => setBank(i, { accountNumber: e.target.value })} /></Field>
              <Field label="Tên chủ tài khoản"><input className="input uppercase" value={b.accountName} onChange={(e) => setBank(i, { accountName: e.target.value.toUpperCase() })} /></Field>
              <div className="flex items-end justify-between gap-2">
                <label className="flex items-center gap-1.5 pb-2 text-sm"><input type="radio" name="defbank" checked={!!b.isDefault} onChange={() => setS((p) => ({ ...p, bankAccounts: banks.map((x, j) => ({ ...x, isDefault: j === i })) }))} /> Mặc định</label>
                <button className="mb-1 p-1.5 text-slate-400 hover:text-rose-600" onClick={() => setS((p) => ({ ...p, bankAccounts: banks.filter((_, j) => j !== i) }))}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={() => setS((p) => ({ ...p, bankAccounts: [...banks, { id: `bank-${Date.now().toString(36)}`, bankBin: "", bankName: "", accountNumber: "", accountName: "", isDefault: !banks.length }] }))}>
            <Plus size={14} /> Thêm tài khoản
          </Button>
          {preview && (
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
              <QR value={preview} size={110} />
              <p className="text-xs text-slate-600">QR thử 10.000₫ vào tài khoản đầu tiên. Quét bằng app ngân hàng để kiểm tra tên người nhận đúng chưa (không cần chuyển).</p>
            </div>
          )}
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="flex items-center gap-2 font-semibold"><Receipt size={17} /> Hóa đơn điện tử – MISA meInvoice</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tiền tố mã hóa đơn nội bộ"><input className="input" {...sec("invoice", "prefix")} /></Field>
            <Field label="Thuế GTGT mặc định">
              <select className="input" {...sec("invoice", "defaultVatRate")}><option value="8">8%</option><option value="10">10%</option><option value="5">5%</option><option value="0">0%</option><option value="-1">KCT</option></select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={misa.enabled} onChange={(e) => setMisa({ enabled: e.target.checked })} /> Bật tích hợp MISA meInvoice</label>
          <Field label="Môi trường">
            <select className="input" value={misa.env} onChange={(e) => setMisa({ env: e.target.value as MisaSettings["env"] })}>
              <option value="mock">Giả lập (demo – không gọi MISA)</option>
              <option value="test">MISA Test (testapi.meinvoice.vn)</option>
              <option value="live">MISA Production (api.meinvoice.vn)</option>
            </select>
          </Field>
          {misa.env !== "mock" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="AppID (MISA cấp)"><input className="input" value={misa.appId ?? ""} onChange={(e) => setMisa({ appId: e.target.value })} /></Field>
              <Field label="MST doanh nghiệp"><input className="input" value={misa.taxCode ?? ""} onChange={(e) => setMisa({ taxCode: e.target.value })} /></Field>
              <Field label="Tài khoản MISA"><input className="input" autoComplete="off" value={misa.username ?? ""} onChange={(e) => setMisa({ username: e.target.value })} /></Field>
              <Field label="Mật khẩu MISA" hint={misa.hasPassword ? "Đã lưu (mã hóa AES-256). Bỏ trống để giữ nguyên" : "Lưu mã hóa AES-256-GCM"}>
                <input className="input" type="password" autoComplete="new-password" value={misaPassword} onChange={(e) => setMisaPassword(e.target.value)} />
              </Field>
              <Field label="Base URL (tùy chọn)" className="sm:col-span-2" hint="Chỉ điền nếu MISA cấp đường dẫn API khác mặc định"><input className="input" value={misa.baseUrl ?? ""} onChange={(e) => setMisa({ baseUrl: e.target.value })} /></Field>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ký hiệu hóa đơn" hint="VD: 1C26TDL"><input className="input" value={misa.invSeries ?? ""} onChange={(e) => setMisa({ invSeries: e.target.value })} /></Field>
            <Field label="InvoiceTemplateID (tùy chọn)"><input className="input" value={misa.invoiceTemplateId ?? ""} onChange={(e) => setMisa({ invoiceTemplateId: e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!misa.withCode} onChange={(e) => setMisa({ withCode: e.target.checked })} /> Hóa đơn có mã của cơ quan thuế</label>
          <Button size="sm" variant="secondary" loading={testState.isLoading} onClick={async () => {
            try { const r = await test().unwrap(); toast(r.message ?? (r.ok ? "OK" : "Lỗi"), r.ok ? "ok" : "err"); } catch (e) { toast(errorMessage(e), "err"); }
          }}>Kiểm tra kết nối (lưu trước khi kiểm tra)</Button>
        </section>

        <DomainsSection />
      </div>
    </>
  );
}

function DomainsSection() {
  const { data } = useDomainsQuery();
  const [add, { isLoading }] = useAddDomainMutation();
  const [verify, vState] = useVerifyDomainMutation();
  const [del] = useDeleteDomainMutation();
  const [domain, setDomain] = useState("");
  const toast = useToast();
  return (
    <section className="card space-y-3 p-4">
      <h2 className="flex items-center gap-2 font-semibold"><Globe size={17} /> Tên miền riêng</h2>
      <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-500">
        <li>Thêm tên miền ở ô dưới.</li>
        <li>Tại nhà cung cấp DNS: thêm bản ghi <b>TXT</b> như hiển thị (chứng minh bạn sở hữu domain) và trỏ <b>CNAME</b> về <code>cname.vercel-dns.com</code>.</li>
        <li>Bấm <b>Xác minh</b>. Chỉ domain đã xác minh mới hiển thị website của bạn.</li>
      </ol>
      <ul className="divide-y rounded-lg border">
        {data?.map((d) => (
          <li key={d.id} className="space-y-2 px-3 py-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{d.domain}</span>
              <span className="flex items-center gap-2">
                {d.verifiedAt ? <Badge color="green">Đã xác minh</Badge> : <Badge color="amber">Chờ xác minh</Badge>}
                <button className="p-1 text-slate-400 hover:text-rose-600" aria-label={`Xóa ${d.domain}`} onClick={() => del(d.id)}><Trash2 size={15} /></button>
              </span>
            </div>
            {!d.verifiedAt && d.txtValue && (
              <div className="rounded-lg bg-slate-50 p-2 text-xs">
                <div>Loại: <b>TXT</b> · Tên: <code className="select-all">{d.txtName}</code></div>
                <div>Giá trị: <code className="select-all break-all">{d.txtValue}</code></div>
                <Button size="sm" variant="secondary" className="mt-2" loading={vState.isLoading}
                  onClick={async () => { try { await verify(d.id).unwrap(); toast("Đã xác minh tên miền"); } catch (e) { toast(errorMessage(e), "err"); } }}>
                  Xác minh
                </Button>
              </div>
            )}
          </li>
        ))}
        {!data?.length && <li className="px-3 py-2 text-sm text-slate-500">Chưa có tên miền riêng</li>}
      </ul>
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); try { await add({ domain }).unwrap(); setDomain(""); toast("Đã thêm, hãy thêm bản ghi TXT để xác minh"); } catch (er) { toast(errorMessage(er), "err"); } }}>
        <input className="input" placeholder="vd: dulichabc.vn" aria-label="Tên miền mới" value={domain} onChange={(e) => setDomain(e.target.value)} />
        <Button loading={isLoading}>Thêm</Button>
      </form>
    </section>
  );
}
