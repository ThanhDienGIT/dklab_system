"use client";
import { AlertTriangle, CalendarClock, CheckCircle2, Phone, RefreshCw } from "lucide-react";
import { useState } from "react";
import { usePerm } from "@/components/admin/AdminShell";
import { Guide, type GuideStep } from "@/components/Guide";
import { Badge, Button, cx, Empty, PageHeader, Skeleton, Stat, useNow, useToast } from "@/components/ui";
import { dateVN, telHref } from "@/lib/format";
import { errorMessage, useGenerateTaxMutation, useTaxTasksQuery, useUpdateTaxMutation } from "@/store/api";
import type { TaxTaskRow } from "@/store/types";

const GUIDE: GuideStep[] = [
  { target: "tax-gen", title: "Sinh lịch kê khai", body: "Tạo nghĩa vụ thuế 3 tháng tới cho mọi hợp đồng đang hiệu lực (theo kỳ tháng/quý của từng khách). Bấm lại không bị trùng." },
  { target: "tax-list", title: "Theo dõi hạn nộp", body: "Đỏ là quá hạn, cam là sắp đến hạn trong 7 ngày. Bấm “Đã nộp” khi hoàn thành tờ khai." },
];

export default function TaxPage() {
  const { data, isLoading } = useTaxTasksQuery();
  const [gen, g] = useGenerateTaxMutation();
  const [upd] = useUpdateTaxMutation();
  const [show, setShow] = useState<"pending" | "all">("pending");
  const toast = useToast();
  const can = usePerm();
  const nowMs = useNow();
  const today = new Date(nowMs + 7 * 3600_000).toISOString().slice(0, 10);
  const soon = new Date(nowMs + 7 * 3600_000 + 7 * 86400_000).toISOString().slice(0, 10);
  const list = (data ?? []).filter((t) => show === "all" || t.status === "pending");
  const overdue = (data ?? []).filter((t) => t.overdue).length;
  const dueSoon = (data ?? []).filter((t) => t.status === "pending" && t.dueDate >= today && t.dueDate <= soon).length;
  const groups: { title: string; rows: TaxTaskRow[] }[] = [
    { title: "Quá hạn", rows: list.filter((t) => t.overdue) },
    { title: "7 ngày tới", rows: list.filter((t) => !t.overdue && t.dueDate <= soon && t.status === "pending") },
    { title: "Sau đó", rows: list.filter((t) => !t.overdue && (t.dueDate > soon || t.status === "done")) },
  ];

  return (
    <>
      <PageHeader title="Lịch kê khai thuế" desc="Nhắc hạn nộp tờ khai của các khách hàng doanh nghiệp (tham khảo, cần đối chiếu quy định hiện hành)"
        actions={can("contract.manage") && <Button data-guide="tax-gen" variant="secondary" loading={g.isLoading} onClick={async () => { try { const r = await gen({ months: 3 }).unwrap(); toast(`Đã tạo ${r.created} nghĩa vụ mới`); } catch (e) { toast(errorMessage(e), "err"); } }}><RefreshCw size={16} /> Sinh lịch 3 tháng tới</Button>} />
      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat label="Quá hạn" value={<span className={overdue ? "text-rose-600" : ""}>{overdue}</span>} icon={<AlertTriangle size={16} />} />
        <Stat label="Đến hạn 7 ngày" value={dueSoon} icon={<CalendarClock size={16} />} />
        <Stat label="Đã nộp" value={(data ?? []).filter((t) => t.status === "done").length} icon={<CheckCircle2 size={16} />} />
      </div>
      <div className="mb-3 flex gap-1 rounded-lg bg-slate-200/60 p-1 sm:w-max">
        {(["pending", "all"] as const).map((k) => <button key={k} onClick={() => setShow(k)} className={cx("rounded-md px-3 py-1.5 text-sm", show === k ? "bg-white font-semibold shadow-sm" : "text-slate-600")}>{k === "pending" ? "Chưa nộp" : "Tất cả"}</button>)}
      </div>
      {isLoading ? <Skeleton /> : !list.length ? <Empty>Không có nghĩa vụ nào. Bấm “Sinh lịch 3 tháng tới”.</Empty> : (
        <div data-guide="tax-list" className="space-y-5">
          {groups.filter((x) => x.rows.length).map((gr) => (
            <section key={gr.title}>
              <h2 className={cx("mb-2 text-sm font-semibold uppercase tracking-wider", gr.title === "Quá hạn" ? "text-rose-600" : "text-slate-500")}>{gr.title} · {gr.rows.length}</h2>
              <div className="card divide-y">
                {gr.rows.map((t) => (
                  <div key={t.id} className={cx("flex flex-wrap items-center gap-3 px-4 py-3 text-sm", t.overdue && "bg-rose-50/60")}>
                    <div className="w-24 shrink-0 font-semibold tabular-nums">{dateVN(t.dueDate)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{t.label} <span className="font-normal text-slate-500">· kỳ {t.period}</span></div>
                      <div className="text-xs text-slate-500">{t.customerName} · MST {t.customerTaxCode ?? "—"} · {t.contractCode}</div>
                    </div>
                    {t.customerPhone && <a href={telHref(t.customerPhone)} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50" aria-label={`Gọi ${t.customerName}`}><Phone size={15} /></a>}
                    {t.status === "done" ? <Badge color="green">Đã nộp</Badge> : can("tax.manage") && (
                      <Button size="sm" variant="success" onClick={async () => { try { await upd({ id: t.id, status: "done" }).unwrap(); toast("Đã đánh dấu đã nộp"); } catch (e) { toast(errorMessage(e), "err"); } }}>Đã nộp</Button>
                    )}
                    {t.status === "done" && can("tax.manage") && <Button size="sm" variant="ghost" onClick={() => upd({ id: t.id, status: "pending" })}>Hoàn tác</Button>}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <Guide steps={GUIDE} storageKey="admin-tax" />
    </>
  );
}
