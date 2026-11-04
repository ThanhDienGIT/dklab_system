"use client";
import { FileSpreadsheet, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePerm } from "@/components/admin/AdminShell";
import { Badge, Button, Empty, Field, Modal, PageHeader, Skeleton, useToast } from "@/components/ui";
import { dateVN, vnd } from "@/lib/format";
import { errorMessage, useBillContractsMutation, useCatalogQuery, useContractsQuery, useCustomersQuery, useDeleteContractMutation, useSaveContractMutation } from "@/store/api";
import type { Contract } from "@/store/types";

const ST = { active: { l: "Đang hiệu lực", c: "green" }, paused: { l: "Tạm dừng", c: "amber" }, ended: { l: "Đã kết thúc", c: "slate" } } as const;
const thisPeriod = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 7);

export default function ContractsPage() {
  const { data, isLoading } = useContractsQuery();
  const [edit, setEdit] = useState<Partial<Contract> | null>(null);
  const [billOpen, setBillOpen] = useState(false);
  const can = usePerm();
  const active = data?.filter((c) => c.status === "active") ?? [];
  return (
    <>
      <PageHeader title="Hợp đồng dịch vụ" desc={`${active.length} hợp đồng đang hiệu lực · phí tháng ${vnd(active.reduce((s, c) => s + c.monthlyFee, 0))}`}
        actions={can("contract.manage") && <>
          <Button variant="secondary" onClick={() => setBillOpen(true)}><FileSpreadsheet size={16} /> Lập hóa đơn phí tháng</Button>
          <Button onClick={() => setEdit({ taxPeriod: "quarterly", status: "active", startDate: new Date().toISOString().slice(0, 10), monthlyFee: 1_000_000 })}><Plus size={16} /> Hợp đồng</Button>
        </>} />
      {isLoading ? <Skeleton /> : !data?.length ? <Empty>Chưa có hợp đồng.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-2.5">Mã</th><th>Khách hàng</th><th>Dịch vụ</th><th>Kỳ kê khai</th><th className="text-right">Phí / tháng</th><th className="pl-4">Đã lập HĐ</th><th>Trạng thái</th><th /></tr></thead>
            <tbody className="divide-y">
              {data.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs">{c.code}</td>
                  <td className="font-medium">{c.customerName}<div className="text-xs font-normal text-slate-500">MST {c.customerTaxCode ?? "—"}</div></td>
                  <td>{c.title}<div className="text-xs text-slate-500">từ {dateVN(c.startDate)}</div></td>
                  <td>{c.taxPeriod === "monthly" ? "Theo tháng" : "Theo quý"}</td>
                  <td className="text-right tabular-nums">{vnd(c.monthlyFee)}</td>
                  <td className="pl-4 text-xs">{c.lastBilledPeriod ?? "—"}</td>
                  <td><Badge color={ST[c.status].c}>{ST[c.status].l}</Badge></td>
                  <td className="pr-3 text-right">{can("contract.manage") && <Button size="sm" variant="ghost" onClick={() => setEdit(c)}>Sửa</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && <ContractForm value={edit} onClose={() => setEdit(null)} />}
      {billOpen && <BillModal onClose={() => setBillOpen(false)} />}
    </>
  );
}

function BillModal({ onClose }: { onClose: () => void }) {
  const [period, setPeriod] = useState(thisPeriod());
  const [bill, { isLoading, data }] = useBillContractsMutation();
  const toast = useToast();
  return (
    <Modal open onClose={onClose} title="Lập hóa đơn phí dịch vụ"
      footer={<Button loading={isLoading} onClick={async () => { try { const r = await bill({ period }).unwrap(); toast(`Đã lập ${r.created.length} hóa đơn`); } catch (e) { toast(errorMessage(e), "err"); } }}>Lập hóa đơn</Button>}>
      <Field required label="Kỳ phí (tháng)" hint="Mỗi hợp đồng chỉ lập 1 hóa đơn cho mỗi kỳ, bấm nhiều lần không bị trùng"><input type="month" className="input" value={period} onChange={(e) => setPeriod(e.target.value)} /></Field>
      {data && (
        <p className="mt-3 text-sm">{data.created.length ? <>Đã lập {data.created.length} hóa đơn. <Link className="text-brand underline" href="/admin/invoices">Xem hóa đơn</Link> để gửi QR thanh toán / đẩy MISA.</> : "Không có hợp đồng nào cần lập cho kỳ này."}</p>
      )}
    </Modal>
  );
}

function ContractForm({ value, onClose }: { value: Partial<Contract>; onClose: () => void }) {
  const [f, setF] = useState(value);
  const { data: customers } = useCustomersQuery({});
  const { data: cat } = useCatalogQuery();
  const [save, { isLoading }] = useSaveContractMutation();
  const [del] = useDeleteContractMutation();
  const toast = useToast();
  const b = (k: keyof Contract) => ({ value: (f[k] as string | number | null) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value }) });
  return (
    <Modal open onClose={onClose} title={value.id ? `Hợp đồng ${value.code}` : "Thêm hợp đồng"}
      footer={<>
        {value.id && <Button variant="ghost" className="mr-auto text-rose-600" onClick={async () => { if (confirm("Xóa hợp đồng và lịch thuế liên quan?")) { await del(value.id!); onClose(); } }}>Xóa</Button>}
        <Button loading={isLoading} onClick={async () => { try { await save({ ...f, monthlyFee: Number(f.monthlyFee ?? 0), itemId: f.itemId || null, endDate: f.endDate || null }).unwrap(); toast("Đã lưu"); onClose(); } catch (e) { toast(errorMessage(e), "err"); } }}>Lưu</Button>
      </>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field required label="Khách hàng (doanh nghiệp)" className="sm:col-span-2" hint="Thêm khách mới ở mục Khách hàng (nhớ điền MST)">
          <select className="input" {...b("customerId")}><option value="">— Chọn —</option>{customers?.items.map((c) => <option key={c.id} value={c.id}>{c.fullName}{c.taxCode ? ` · MST ${c.taxCode}` : ""}</option>)}</select>
        </Field>
        <Field required label="Tên hợp đồng" className="sm:col-span-2"><input className="input" {...b("title")} /></Field>
        <Field label="Gói dịch vụ"><select className="input" {...b("itemId")}><option value="">—</option>{cat?.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>
        <Field required label="Phí / tháng"><input className="input" type="number" step={100000} min={0} {...b("monthlyFee")} /></Field>
        <Field required label="Kỳ kê khai GTGT"><select className="input" {...b("taxPeriod")}><option value="quarterly">Theo quý</option><option value="monthly">Theo tháng</option></select></Field>
        <Field required label="Trạng thái"><select className="input" {...b("status")}><option value="active">Đang hiệu lực</option><option value="paused">Tạm dừng</option><option value="ended">Đã kết thúc</option></select></Field>
        <Field required label="Ngày bắt đầu"><input className="input" type="date" {...b("startDate")} /></Field>
        <Field label="Ngày kết thúc"><input className="input" type="date" {...b("endDate")} /></Field>
        <Field label="Ghi chú" className="sm:col-span-2"><textarea className="input" rows={2} {...b("note")} /></Field>
      </div>
    </Modal>
  );
}
