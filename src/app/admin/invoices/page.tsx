"use client";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { usePerm } from "@/components/admin/AdminShell";
import { EINVOICE_STATUS, INVOICE_STATUS } from "@/components/admin/status";
import { Badge, cx, Empty, PageHeader, Skeleton } from "@/components/ui";
import { dateVN, vnd } from "@/lib/format";
import { useInvoicesQuery } from "@/store/api";

function List() {
  const sp = useSearchParams();
  const [status, setStatus] = useState(sp.get("status") ?? "all");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useInvoicesQuery({ status, q: search || undefined });
  const can = usePerm();
  return (
    <>
      <PageHeader
        title="Hóa đơn"
        desc="Lập hóa đơn, gửi mã QR chuyển khoản, ghi nhận thanh toán, đẩy hóa đơn điện tử MISA"
        actions={can("invoice.create") && <Link href="/admin/invoices/new" className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white"><Plus size={16} /> Lập hóa đơn</Link>}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-200/60 p-1">
          {["all", "issued", "paid", "cancelled"].map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={cx("whitespace-nowrap rounded-md px-3 py-1.5 text-sm", status === s ? "bg-white font-medium shadow-sm" : "text-slate-600")}>
              {s === "all" ? "Tất cả" : INVOICE_STATUS[s].label}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setSearch(q); }} className="relative sm:ml-auto sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Mã HĐ, tên khách, SĐT…" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
      </div>
      {isLoading ? <Skeleton /> : !data?.items.length ? <Empty>Chưa có hóa đơn.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr><th className="px-4 py-2.5">Mã</th><th>Khách hàng</th><th>Ngày</th><th className="text-right">Tổng tiền</th><th className="text-right">Đã thu</th><th className="pl-4">Trạng thái</th><th>HĐĐT</th></tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5"><Link href={`/admin/invoices/${i.id}`} className="font-medium text-brand hover:underline">{i.code}</Link></td>
                  <td>{i.buyerName}<div className="text-xs text-slate-500">{i.buyerPhone}</div></td>
                  <td>{dateVN(i.issueDate)}</td>
                  <td className="text-right tabular-nums">{vnd(i.total)}</td>
                  <td className="text-right tabular-nums">{vnd(i.paidAmount)}</td>
                  <td className="pl-4"><Badge color={INVOICE_STATUS[i.status].color}>{INVOICE_STATUS[i.status].label}</Badge></td>
                  <td><Badge color={EINVOICE_STATUS[i.einvoiceStatus].color}>{i.einvoiceData?.invNo ? `Số ${i.einvoiceData.invNo}` : EINVOICE_STATUS[i.einvoiceStatus].label}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function InvoicesPage() {
  return <Suspense><List /></Suspense>;
}
