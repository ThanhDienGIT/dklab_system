"use client";
import Link from "next/link";
import { useState } from "react";
import { Badge, Button, cx, Empty, PageHeader, Skeleton, useToast } from "@/components/ui";
import { dateTimeVN, vnd } from "@/lib/format";
import { getAddon, getPlan } from "@/modules/plans";
import { errorMessage } from "@/store/api";
import { useDecideOrderMutation, useOrdersQuery } from "@/store/platform";

const ST = { pending: { l: "Chờ thanh toán", c: "amber" }, paid: { l: "Đã kích hoạt", c: "green" }, cancelled: { l: "Đã hủy", c: "slate" } } as const;

export default function OrdersPage() {
  const [status, setStatus] = useState("pending");
  const { data, isLoading } = useOrdersQuery(status, { pollingInterval: 30_000 });
  const [decide, { isLoading: busy }] = useDecideOrderMutation();
  const toast = useToast();
  return (
    <>
      <PageHeader title="Đơn mua gói / plugin" desc="Đối chiếu sao kê theo NỘI DUNG chuyển khoản (mã đơn) rồi bấm Xác nhận để kích hoạt" />
      <div className="mb-3 flex gap-1 rounded-lg bg-slate-200/60 p-1 sm:w-max">
        {["pending", "paid", "cancelled", "all"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={cx("rounded-md px-3 py-1.5 text-sm", status === s ? "bg-white font-semibold shadow-sm" : "text-slate-600")}>
            {s === "all" ? "Tất cả" : ST[s as keyof typeof ST].l}
          </button>
        ))}
      </div>
      {isLoading ? <Skeleton /> : !data?.length ? <Empty>Không có đơn.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-2.5">Mã CK</th><th>Doanh nghiệp</th><th>Mua</th><th className="text-right">Số tiền</th><th className="pl-4">Trạng thái</th><th>Ngày</th><th /></tr></thead>
            <tbody className="divide-y">
              {data.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold">{o.code}</td>
                  <td><Link className="text-brand hover:underline" href={`/superdklab/tenants/${o.tenantId}`}>{o.tenantName}</Link><div className="font-mono text-[11px] text-slate-500">{o.tenantSlug}</div></td>
                  <td>{o.kind === "plan" ? `Gói ${getPlan(o.target).name}` : `${o.kind === "trial" ? "Dùng thử " : ""}${getAddon(o.target)?.name ?? o.target}`}{o.kind !== "trial" && <span className="text-slate-500"> · {o.months} tháng</span>}</td>
                  <td className="text-right tabular-nums font-semibold">{o.amount ? vnd(o.amount) : "0₫"}</td>
                  <td className="pl-4"><Badge color={ST[o.status].c}>{ST[o.status].l}</Badge></td>
                  <td className="text-xs text-slate-500">{dateTimeVN(o.createdAt)}</td>
                  <td className="whitespace-nowrap pr-3 text-right">
                    {o.status === "pending" && <>
                      <Button size="sm" variant="success" loading={busy} onClick={async () => {
                        if (!confirm(`Xác nhận đã nhận ${vnd(o.amount)} với nội dung ${o.code}?`)) return;
                        try { await decide({ id: o.id, action: "approve" }).unwrap(); toast("Đã kích hoạt cho doanh nghiệp"); } catch (e) { toast(errorMessage(e), "err"); }
                      }}>Xác nhận đã nhận tiền</Button>
                      <Button size="sm" variant="ghost" onClick={async () => { const note = prompt("Lý do từ chối?"); if (note) { await decide({ id: o.id, action: "reject", note }); toast("Đã từ chối"); } }}>Từ chối</Button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
