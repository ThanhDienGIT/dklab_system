"use client";
import { ChevronLeft, ChevronRight, LogIn, LogOut, Phone } from "lucide-react";
import { useState } from "react";
import { usePerm } from "@/components/admin/AdminShell";
import { Badge, Button, cx, Empty, Modal, PageHeader, Skeleton, useNow, useToast } from "@/components/ui";
import { dateTimeVN, telHref, timeVN } from "@/lib/format";
import { errorMessage, useMeQuery, useReservationsQuery, useResourcesQuery, useUpdateReservationMutation } from "@/store/api";
import type { Reservation } from "@/store/types";

const vnToday = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const vnMs = (date: string, hhmm: string) => Date.parse(`${date}T${hhmm}:00+07:00`);
const hhmm = (d: string) => timeVN(d);
const STATUS: Record<string, { label: string; cls: string; badge: string }> = {
  pending: { label: "Chờ xác nhận", cls: "bg-rose-100 border-rose-400 text-rose-900", badge: "red" },
  confirmed: { label: "Đã xác nhận", cls: "bg-amber-100 border-amber-400 text-amber-900", badge: "amber" },
  checked_in: { label: "Đang phục vụ", cls: "bg-sky-600 border-sky-700 text-white", badge: "blue" },
  completed: { label: "Hoàn tất", cls: "bg-slate-200 border-slate-300 text-slate-600", badge: "slate" },
};

export default function SchedulePage() {
  const { data: me } = useMeQuery();
  const [date, setDate] = useState(vnToday());
  const rooms = me?.industry.engine === "rooms";
  const days = rooms ? 14 : 1;
  const { data: list, isLoading } = useReservationsQuery({ date, days }, { pollingInterval: 60_000 });
  const { data: resources } = useResourcesQuery();
  const [sel, setSel] = useState<Reservation | null>(null);
  const now = useNow(30_000);
  if (!me || isLoading || !resources) return <Skeleton rows={6} />;

  const engine = me.industry.engine;
  const kinds = engine === "tables" ? ["table"] : engine === "rooms" ? ["room"] : ["staff", "bed"];
  const rows = resources.filter((r) => kinds.includes(r.kind) && r.isActive);
  const cfg = me.industry.booking;
  // Trục thời gian: ngày (giờ mở → đóng) hoặc 14 ngày (khách sạn)
  const t0 = rooms ? vnMs(date, "00:00") : vnMs(date, cfg.open);
  const t1 = rooms ? vnMs(addDays(date, days), "00:00") : vnMs(date, cfg.close);
  const span = t1 - t0;
  const ticks = rooms
    ? Array.from({ length: days }, (_, i) => ({ at: vnMs(addDays(date, i), "00:00"), label: new Date(`${addDays(date, i)}T00:00:00Z`).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "UTC" }) }))
    : Array.from({ length: Math.ceil(span / 3600_000) }, (_, i) => ({ at: t0 + i * 3600_000, label: hhmm(new Date(t0 + i * 3600_000).toISOString()) }));
  const pct = (ms: number) => Math.max(0, Math.min(100, ((ms - t0) / span) * 100));

  return (
    <>
      <PageHeader title="Lịch" desc={rooms ? "14 ngày, theo phòng" : `Theo ${engine === "tables" ? "bàn" : "nhân viên / phòng"}, ${cfg.open} – ${cfg.close}`}
        actions={
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" aria-label="Lùi" onClick={() => setDate(addDays(date, -days))}><ChevronLeft size={16} /></Button>
            <input type="date" className="input h-9 w-40" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Chọn ngày" />
            <Button variant="secondary" size="sm" aria-label="Tiến" onClick={() => setDate(addDays(date, days))}><ChevronRight size={16} /></Button>
            <Button variant="ghost" size="sm" onClick={() => setDate(vnToday())}>Hôm nay</Button>
          </div>
        } />
      {!rows.length ? <Empty>Chưa có tài nguyên để xếp lịch.</Empty> : (
        <div className="card overflow-x-auto">
          <div className="min-w-[860px]">
            <div className="flex border-b bg-slate-50 text-xs text-slate-500">
              <div className="w-36 shrink-0 px-3 py-2 font-semibold">{engine === "tables" ? "Bàn" : engine === "rooms" ? "Phòng" : "Nhân viên / phòng"}</div>
              <div className="relative h-8 flex-1">
                {ticks.map((t) => <span key={t.at} className="absolute top-2 -translate-x-1/2 tabular-nums" style={{ left: `${pct(t.at)}%` }}>{t.label}</span>)}
              </div>
            </div>
            {rows.map((r) => (
              <div key={r.id} className="flex border-b last:border-0">
                <div className="w-36 shrink-0 px-3 py-3 text-sm font-medium">{r.name}<div className="text-[11px] font-normal text-slate-400">{r.area ?? (r.kind === "staff" ? "Nhân viên" : "")}{r.kind === "table" ? ` · ${r.capacity} chỗ` : ""}</div></div>
                <div className="relative h-14 flex-1 bg-[linear-gradient(to_right,rgb(226_232_240)_1px,transparent_1px)]" style={{ backgroundSize: `${100 / ticks.length}% 100%` }}>
                  {now > t0 && now < t1 && <div className="absolute inset-y-0 z-10 w-0.5 bg-rose-500" style={{ left: `${pct(now)}%` }} aria-hidden />}
                  {list?.filter((x) => x.resourceId === r.id).map((x) => {
                    const s = pct(Date.parse(x.startAt));
                    const e = pct(Date.parse(x.endAt));
                    const st = STATUS[x.status] ?? STATUS.confirmed;
                    return (
                      <button key={x.id} onClick={() => setSel(x)} title={`${x.name ?? ""} ${hhmm(x.startAt)}–${hhmm(x.endAt)}`}
                        className={cx("absolute top-1.5 bottom-1.5 overflow-hidden rounded-lg border px-2 text-left text-[11px] leading-tight shadow-sm transition hover:z-20 hover:shadow-md", st.cls)}
                        style={{ left: `${s}%`, width: `${Math.max(1.5, e - s)}%` }}>
                        <div className="truncate font-semibold">{x.name ?? "Khách"}</div>
                        <div className="truncate opacity-80">{rooms ? x.itemName ?? "" : `${hhmm(x.startAt)} · ${x.itemName ?? `${x.partySize} khách`}`}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
        {Object.entries(STATUS).map(([k, v]) => <span key={k} className="inline-flex items-center gap-1.5"><span className={cx("h-3 w-5 rounded border", v.cls)} /> {v.label}</span>)}
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-0.5 bg-rose-500" /> Bây giờ</span>
      </div>
      {sel && <ResvModal r={sel} rooms={rooms} onClose={() => setSel(null)} />}
    </>
  );
}

function ResvModal({ r, rooms, onClose }: { r: Reservation; rooms: boolean; onClose: () => void }) {
  const [upd, { isLoading }] = useUpdateReservationMutation();
  const toast = useToast();
  const can = usePerm();
  const act = async (status: string, msg: string) => { try { await upd({ id: r.id, status }).unwrap(); toast(msg); onClose(); } catch (e) { toast(errorMessage(e), "err"); } };
  const st = STATUS[r.status] ?? STATUS.confirmed;
  return (
    <Modal open onClose={onClose} title={r.name ?? "Khách"}>
      <div className="space-y-2 text-sm">
        <p>{r.code && <span className="text-slate-500">{r.code} · </span>}<Badge color={st.badge}>{st.label}</Badge></p>
        <p>{dateTimeVN(r.startAt)} → {dateTimeVN(r.endAt)}</p>
        {r.itemName && <p>Dịch vụ / loại: <b>{r.itemName}</b></p>}
        <p>{r.partySize} khách</p>
        {r.phone && <a href={telHref(r.phone)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"><Phone size={13} /> {r.phone}</a>}
        {can("booking.handle") && r.status !== "completed" && (
          <div className="flex flex-wrap gap-1.5 border-t pt-3">
            {r.status === "pending" && <Button size="sm" variant="secondary" loading={isLoading} onClick={() => act("confirmed", "Đã xác nhận")}>Xác nhận</Button>}
            {r.status !== "checked_in" && <Button size="sm" variant="success" loading={isLoading} onClick={() => act("checked_in", "Đã nhận khách")}><LogIn size={14} /> {rooms ? "Check-in" : "Khách đã đến"}</Button>}
            {r.status === "checked_in" && <Button size="sm" loading={isLoading} onClick={() => act("completed", "Đã hoàn tất")}><LogOut size={14} /> {rooms ? "Check-out" : "Hoàn tất"}</Button>}
            {r.status !== "checked_in" && <Button size="sm" variant="ghost" onClick={() => confirm("Khách không đến? Chỗ sẽ được nhả.") && act("no_show", "Đã nhả chỗ")}>Không đến</Button>}
          </div>
        )}
      </div>
    </Modal>
  );
}
