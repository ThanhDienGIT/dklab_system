"use client";
import { PhoneCall, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePerm } from "@/components/admin/AdminShell";
import { BOOKING_STATUS, INVOICE_STATUS } from "@/components/admin/status";
import { Badge, Button, Empty, Field, Modal, PageHeader, Skeleton, useToast } from "@/components/ui";
import { dateVN, telHref, vnd } from "@/lib/format";
import { errorMessage, useCustomerQuery, useCustomersQuery, useSaveCustomerMutation } from "@/store/api";
import type { Customer } from "@/store/types";

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useCustomersQuery({ q: search || undefined });
  const [editing, setEditing] = useState<Partial<Customer> | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const can = usePerm();
  return (
    <>
      <PageHeader title="Khách hàng" desc="Tự động tạo khi khách đặt chỗ; gộp theo số điện thoại"
        actions={can("customer.manage") && <Button onClick={() => setEditing({ tags: [] })}><Plus size={16} /> Thêm khách</Button>} />
      <form onSubmit={(e) => { e.preventDefault(); setSearch(q); }} className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder="Tìm tên, SĐT, email…" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>
      {isLoading ? <Skeleton /> : !data?.items.length ? <Empty>Chưa có khách hàng.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-2.5">Khách hàng</th><th>Liên hệ</th><th>Nguồn</th><th className="text-right">Lượt đặt</th><th className="px-4 text-right">Đã chi</th></tr></thead>
            <tbody className="divide-y">
              {data.items.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setViewing(c.id)}>
                  <td className="px-4 py-2.5 font-medium">{c.fullName}<div className="flex gap-1">{c.tags.map((t) => <Badge key={t} color="violet">{t}</Badge>)}</div></td>
                  <td>{c.phone && <a onClick={(e) => e.stopPropagation()} href={telHref(c.phone)} className="text-brand">{c.phone}</a>}<div className="text-xs text-slate-500">{c.email}</div></td>
                  <td className="text-slate-600">{c.source}</td>
                  <td className="text-right tabular-nums">{c.bookingCount}</td>
                  <td className="px-4 text-right tabular-nums">{vnd(c.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-slate-500">{data.total} khách hàng</p>
        </div>
      )}
      {editing && <CustomerForm value={editing} onClose={() => setEditing(null)} />}
      {viewing && <CustomerDrawer id={viewing} onClose={() => setViewing(null)} onEdit={(c) => { setViewing(null); setEditing(c); }} />}
    </>
  );
}

function CustomerForm({ value, onClose }: { value: Partial<Customer>; onClose: () => void }) {
  const [f, setF] = useState({ ...value, tagsText: (value.tags ?? []).join(", ") });
  const [save, { isLoading }] = useSaveCustomerMutation();
  const toast = useToast();
  const b = (k: keyof Customer) => ({ value: (f[k] as string) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value })) });
  async function submit() {
    try {
      const { tagsText, ...rest } = f;
      await save({ ...rest, tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean) }).unwrap();
      toast("Đã lưu khách hàng");
      onClose();
    } catch (e) { toast(errorMessage(e), "err"); }
  }
  return (
    <Modal open onClose={onClose} title={value.id ? "Sửa khách hàng" : "Thêm khách hàng"} footer={<Button loading={isLoading} onClick={submit}>Lưu</Button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Họ tên *" className="sm:col-span-2"><input className="input" {...b("fullName")} /></Field>
        <Field label="Số điện thoại"><input className="input" {...b("phone")} /></Field>
        <Field label="Email"><input className="input" {...b("email")} /></Field>
        <Field label="MST (xuất hóa đơn)"><input className="input" {...b("taxCode")} /></Field>
        <Field label="Tag (phân cách dấu phẩy)"><input className="input" value={f.tagsText} onChange={(e) => setF((s) => ({ ...s, tagsText: e.target.value }))} placeholder="VIP, Doanh nghiệp" /></Field>
        <Field label="Địa chỉ" className="sm:col-span-2"><input className="input" {...b("address")} /></Field>
        <Field label="Ghi chú" className="sm:col-span-2"><textarea className="input" {...b("note")} /></Field>
      </div>
    </Modal>
  );
}

function CustomerDrawer({ id, onClose, onEdit }: { id: string; onClose: () => void; onEdit: (c: Customer) => void }) {
  const { data } = useCustomerQuery(id);
  const can = usePerm();
  return (
    <Modal open onClose={onClose} title={data?.fullName ?? "Khách hàng"} wide footer={can("customer.manage") && data && <Button variant="secondary" onClick={() => onEdit(data)}>Sửa thông tin</Button>}>
      {!data ? <Skeleton rows={3} /> : (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            {data.phone && <a href={telHref(data.phone)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white"><PhoneCall size={14} /> {data.phone}</a>}
            {data.email && <span className="rounded-lg border px-3 py-1.5">{data.email}</span>}
            <span className="rounded-lg bg-slate-100 px-3 py-1.5">Đã chi: <b>{vnd(data.totalSpent)}</b></span>
          </div>
          {data.note && <p className="rounded-lg bg-slate-50 p-3">{data.note}</p>}
          <div>
            <h4 className="mb-1 font-semibold">Lịch sử đặt chỗ</h4>
            <ul className="divide-y rounded-lg border">
              {data.bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span>{b.resourceLabel}<span className="block text-xs text-slate-500">{b.code} · {b.bookingDate ? dateVN(b.bookingDate) : "—"} · {b.adults + b.children} khách</span></span>
                  <Badge color={BOOKING_STATUS[b.status].color}>{BOOKING_STATUS[b.status].label}</Badge>
                </li>
              ))}
              {!data.bookings.length && <li className="px-3 py-2 text-slate-500">Chưa có</li>}
            </ul>
          </div>
          <div>
            <h4 className="mb-1 font-semibold">Hóa đơn</h4>
            <ul className="divide-y rounded-lg border">
              {data.invoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <Link href={`/admin/invoices/${i.id}`} className="text-brand hover:underline">{i.code}</Link>
                  <span className="tabular-nums">{vnd(i.total)}</span>
                  <Badge color={INVOICE_STATUS[i.status].color}>{INVOICE_STATUS[i.status].label}</Badge>
                </li>
              ))}
              {!data.invoices.length && <li className="px-3 py-2 text-slate-500">Chưa có</li>}
            </ul>
          </div>
        </div>
      )}
    </Modal>
  );
}
