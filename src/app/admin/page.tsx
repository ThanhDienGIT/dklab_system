"use client";
import { CalendarCheck, Inbox, PhoneCall, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { Badge, PageHeader, Skeleton, Stat } from "@/components/ui";
import { BOOKING_STATUS } from "@/components/admin/status";
import { telHref, timeAgo, vnd } from "@/lib/format";
import { useDashboardQuery, useMeQuery } from "@/store/api";

export default function DashboardPage() {
  const { data: me } = useMeQuery();
  const { data, isLoading } = useDashboardQuery();
  if (isLoading || !data) return <Skeleton rows={6} />;
  const max = Math.max(1, ...data.daily.map((d) => d.n));
  return (
    <>
      <PageHeader title={`Xin chào, ${me?.user.name ?? ""}`} desc="Tổng quan hoạt động 30 ngày gần nhất" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Đặt chỗ mới chờ gọi" value={data.bookings.newCount} sub={`${data.bookings.contacted} đang liên hệ`} icon={<Inbox size={16} />} />
        <Stat label="Xác nhận (30 ngày)" value={data.bookings.confirmed30} sub={`/${data.bookings.total30} yêu cầu`} icon={<CalendarCheck size={16} />} />
        <Stat label="Đã thu (30 ngày)" value={vnd(data.invoices.revenue30)} sub={`Còn phải thu ${vnd(data.invoices.receivable)}`} icon={<Wallet size={16} />} />
        <Stat label="Khách hàng" value={data.customers} icon={<Users size={16} />} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <section className="card p-4 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Yêu cầu đặt chỗ mới nhất</h2>
            <Link href="/admin/bookings" className="text-sm text-brand hover:underline">Xem tất cả</Link>
          </div>
          <ul className="divide-y">
            {data.recent.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{b.fullName} <span className="font-normal text-slate-400">· {b.code}</span></div>
                  <div className="truncate text-xs text-slate-500">{b.resourceLabel ?? "—"} · {timeAgo(b.createdAt)}</div>
                </div>
                <Badge color={BOOKING_STATUS[b.status]?.color}>{BOOKING_STATUS[b.status]?.label}</Badge>
                {b.phone && (
                  <a href={telHref(b.phone)} className="rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100" title={`Gọi ${b.phone}`}>
                    <PhoneCall size={15} />
                  </a>
                )}
              </li>
            ))}
            {!data.recent.length && <li className="py-6 text-center text-sm text-slate-500">Chưa có yêu cầu nào</li>}
          </ul>
        </section>
        <section className="card p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Yêu cầu đặt chỗ 14 ngày</h2>
          <div className="flex h-40 items-end gap-1">
            {data.daily.map((d) => (
              <div key={d.day} className="group relative flex-1">
                <div className="rounded-t bg-brand/80 transition group-hover:bg-brand" style={{ height: `${(d.n / max) * 140}px` }} />
                <div className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                  {d.day.slice(5)}: {d.n}
                </div>
              </div>
            ))}
            {!data.daily.length && <p className="w-full text-center text-sm text-slate-500">Chưa có dữ liệu</p>}
          </div>
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            {data.invoices.unpaidCount} hóa đơn chờ thanh toán, tổng {vnd(data.invoices.receivable)}.{" "}
            <Link href="/admin/invoices?status=issued" className="font-medium underline">Xem</Link>
          </div>
        </section>
      </div>
    </>
  );
}
