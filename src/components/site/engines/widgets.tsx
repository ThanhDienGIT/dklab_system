"use client";
/**
 * Form đặt chỗ cho 3 động cơ: slots (spa/kế toán…), tables (cà phê/nhà hàng), rooms (khách sạn).
 * Dùng chung checklist trường bắt buộc + kiểm tra liên hệ của BookingForm.
 */
import { AlertCircle, BedDouble, CalendarDays, Clock, Minus, Plus, Search, UserRound } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { FloorMap, Legend, type MapTable } from "@/components/FloorMap";
import { Checklist, Consent, ContactInputs, Stepper, Submit, Success, useContactForm } from "@/components/site/BookingForm";
import { vnd } from "@/lib/format";

type Item = { id: string; name: string; price: number; durationMin: number | null; capacity?: number | null; categoryId?: string | null; description?: string | null };

/* ─────────── tiện ích ─────────── */
const vnToday = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const dayLabel = (d: string) => {
  const x = new Date(`${d}T00:00:00Z`);
  return { wd: d === vnToday() ? "Hôm nay" : WD[x.getUTCDay()], dm: `${x.getUTCDate()}/${x.getUTCMonth() + 1}` };
};

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? "Không tải được dữ liệu");
  return j.data as T;
}

/** Thẻ dịch vụ / món / phòng trên trang chủ phát sự kiện để form tự chọn sẵn */
export function PickButton({ id, label = "Chọn" }: { id: string; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(new CustomEvent("dk:pick", { detail: id }));
        document.getElementById("dat-cho")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }}
      className="inline-flex min-h-9 items-center rounded-full bg-orange-600 px-4 text-xs font-semibold text-slate-950 transition hover:bg-orange-500"
    >
      {label}
    </button>
  );
}
function usePick(cb: (id: string) => void) {
  useEffect(() => {
    const h = (e: Event) => cb((e as CustomEvent<string>).detail);
    window.addEventListener("dk:pick", h);
    return () => window.removeEventListener("dk:pick", h);
  }, [cb]);
}

function StepTitle({ n, title, done }: { n: number; title: string; done?: boolean }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${done ? "bg-emerald-600 text-white" : "bg-slate-900 text-white"}`}>{done ? "✓" : n}</span>
      {title}
      <span className="text-rose-600" aria-hidden>*</span>
    </div>
  );
}

function DayPicker({ value, onChange, days = 10 }: { value: string; onChange: (d: string) => void; days?: number }) {
  const today = vnToday();
  const list = Array.from({ length: days }, (_, i) => addDays(today, i));
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Chọn ngày">
      {list.map((d) => {
        const l = dayLabel(d);
        return (
          <button key={d} type="button" role="radio" aria-checked={value === d} onClick={() => onChange(d)}
            className={`flex min-w-16 flex-col items-center rounded-xl border px-3 py-2 text-xs transition ${value === d ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}>
            <span className="font-medium">{l.wd}</span>
            <span className="text-base font-bold">{l.dm}</span>
          </button>
        );
      })}
    </div>
  );
}

function InlineError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 flex items-center gap-1 text-xs font-medium text-rose-600" role="alert"><AlertCircle size={13} /> {msg}</p>;
}

/* ═════════════ SLOTS: dịch vụ + khung giờ ═════════════ */
export function SlotBooking({ items, labels }: { items: Item[]; labels: { item: string; staff?: string; booking: string } }) {
  const ids = useId().replace(/:/g, "");
  const formRef = useRef<HTMLFormElement>(null);
  const f = useContactForm(formRef);
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [date, setDate] = useState(vnToday());
  const [staffId, setStaffId] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [data, setData] = useState<{ staff: { id: string; name: string }[]; slots: { time: string; available: boolean }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [tried, setTried] = useState(false);
  usePick(useCallback((id: string) => { if (items.some((i) => i.id === id)) { setItemId(id); setTime(""); } }, [items]));

  useEffect(() => {
    if (!itemId) return;
    let alive = true;
    const q = new URLSearchParams({ type: "slots", itemId, date, ...(staffId ? { staffId } : {}) });
    Promise.resolve().then(() => alive && setLoading(true));
    getJSON<{ staff: { id: string; name: string }[]; slots: { time: string; available: boolean }[] }>(`/api/public/availability?${q}`)
      .then((d) => alive && (setData(d), setErr("")))
      .catch((e) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [itemId, date, staffId]);

  const item = items.find((i) => i.id === itemId);
  if (f.state.code) return <Success code={f.state.code} total={f.state.total} />;
  const missing = [...(time ? [] : ["Giờ hẹn"]), ...f.checklist.filter((x) => !x.done).map((x) => x.label)];
  const freeCount = data?.slots.filter((s) => s.available).length ?? 0;

  return (
    <form ref={formRef} noValidate className="space-y-5" onSubmit={(e) => {
      e.preventDefault();
      setTried(true);
      if (!time) { document.getElementById(`${ids}-slots`)?.scrollIntoView({ block: "center" }); return; }
      f.submit({ resourceType: "service", itemId, staffId: staffId || null, bookingDate: date, bookingTime: time, note, adults: 1 });
    }}>
      <div data-guide="pick-item">
        <StepTitle n={1} title={`Chọn ${labels.item.toLowerCase()}`} done={!!item} />
        <select className="input" value={itemId} onChange={(e) => { setItemId(e.target.value); setTime(""); }} aria-label={labels.item}>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name} · {i.durationMin ?? 60} phút · {i.price ? vnd(i.price) : "Miễn phí"}</option>)}
        </select>
      </div>
      <div data-guide="pick-date">
        <StepTitle n={2} title="Chọn ngày" done />
        <DayPicker value={date} onChange={(d) => { setDate(d); setTime(""); }} />
      </div>
      {!!data?.staff.length && labels.staff && (
        <div>
          <label htmlFor={`${ids}-staff`} className="mb-1 block text-xs font-semibold text-slate-700">{labels.staff} <span className="font-normal text-slate-400">(không bắt buộc)</span></label>
          <select id={`${ids}-staff`} className="input" value={staffId} onChange={(e) => { setStaffId(e.target.value); setTime(""); }}>
            <option value="">Bất kỳ ai còn trống</option>
            {data.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}
      <div id={`${ids}-slots`} data-guide="pick-time">
        <StepTitle n={3} title={`Chọn giờ${data ? ` · còn ${freeCount} khung trống` : ""}`} done={!!time} />
        {err && <InlineError msg={err} />}
        <div className={`grid grid-cols-4 gap-2 sm:grid-cols-6 ${loading ? "opacity-50" : ""}`} role="radiogroup" aria-label="Khung giờ">
          {data?.slots.map((s) => (
            <button key={s.time} type="button" role="radio" aria-checked={time === s.time} disabled={!s.available} onClick={() => setTime(s.time)}
              className={`min-h-10 rounded-lg border text-sm font-medium tabular-nums transition ${time === s.time ? "border-orange-600 bg-orange-500 text-slate-950" : s.available ? "border-slate-200 bg-white hover:border-slate-500" : "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400 line-through"}`}>
              {s.time}
            </button>
          ))}
        </div>
        {data && !freeCount && <p className="mt-2 text-sm text-slate-500">Ngày này đã kín lịch, vui lòng chọn ngày khác.</p>}
        {tried && !time && <InlineError msg="Vui lòng chọn giờ hẹn" />}
      </div>
      <Checklist items={[{ label: "Giờ hẹn", done: !!time }, ...f.checklist]} />
      <ContactInputs f={f} ids={ids} />
      <div>
        <label htmlFor={`${ids}-note`} className="mb-1 block text-xs font-semibold text-slate-700">Ghi chú <span className="font-normal text-slate-400">(không bắt buộc)</span></label>
        <textarea id={`${ids}-note`} className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
      </div>
      <Consent f={f} ids={ids} text="Tôi đồng ý cung cấp thông tin để được liên hệ xác nhận lịch hẹn." />
      {item && time && (
        <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
          <span className="text-sm text-slate-300"><Clock size={14} className="mr-1 inline" />{time} · {dayLabel(date).dm} · {item.durationMin ?? 60} phút</span>
          <span className="text-lg font-bold">{item.price ? vnd(item.price) : "Miễn phí"}</span>
        </div>
      )}
      {f.state.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{f.state.error}</p>}
      <Submit loading={f.state.loading} label={`Gửi yêu cầu ${labels.booking.toLowerCase()}`} missing={missing} />
    </form>
  );
}

/* ═════════════ TABLES: giờ đến + sơ đồ bàn (+ món đặt trước) ═════════════ */
type TableView = { id: string; name: string; area: string; capacity: number; x: number; y: number; shape: string; free: boolean; fits: boolean };

export function TableBooking({ menu, preorder }: { menu: Item[]; preorder?: boolean }) {
  const ids = useId().replace(/:/g, "");
  const formRef = useRef<HTMLFormElement>(null);
  const f = useContactForm(formRef);
  const [date, setDate] = useState(vnToday());
  const [times, setTimes] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [party, setParty] = useState(2);
  const [tables, setTables] = useState<TableView[] | null>(null);
  const [area, setArea] = useState("");
  const [tableId, setTableId] = useState<string | "auto">("auto");
  const [order, setOrder] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [tried, setTried] = useState(false);
  usePick(useCallback((id: string) => { if (preorder && menu.some((m) => m.id === id)) setOrder((o) => ({ ...o, [id]: (o[id] ?? 0) + 1 })); }, [menu, preorder]));

  useEffect(() => {
    let alive = true;
    getJSON<{ times: string[] }>(`/api/public/availability?type=times&date=${date}`)
      .then((d) => {
        if (!alive) return;
        setTimes(d.times);
        setTime((t) => (d.times.includes(t) ? t : (d.times.find((x) => x >= "18:00") ?? d.times[0] ?? "")));
      })
      .catch((e) => alive && setErr(e.message));
    return () => { alive = false; };
  }, [date]);

  useEffect(() => {
    if (!time) return;
    let alive = true;
    getJSON<{ tables: TableView[] }>(`/api/public/availability?type=tables&date=${date}&time=${time}&party=${party}`)
      .then((d) => {
        if (!alive) return;
        setTables(d.tables);
        setErr("");
        setArea((a) => a || d.tables[0]?.area || "");
        setTableId((cur) => (cur !== "auto" && !d.tables.some((t) => t.id === cur && t.free && t.fits) ? "auto" : cur));
      })
      .catch((e) => alive && setErr(e.message));
    return () => { alive = false; };
  }, [date, time, party]);

  const areas = useMemo(() => [...new Set((tables ?? []).map((t) => t.area))], [tables]);
  const freeFit = (tables ?? []).filter((t) => t.free && t.fits).length;
  const mapTables: MapTable[] = (tables ?? [])
    .filter((t) => t.area === area)
    .map((t) => ({ ...t, state: t.id === tableId ? "selected" : !t.free ? "busy" : !t.fits ? "small" : "free", sub: !t.free ? "Đã có khách" : !t.fits ? `Tối đa ${t.capacity}` : undefined }));
  const orderList = Object.entries(order).filter(([, q]) => q > 0).map(([id, qty]) => ({ itemId: id, qty, item: menu.find((m) => m.id === id)! })).filter((x) => x.item);
  const orderTotal = orderList.reduce((s, x) => s + x.qty * x.item.price, 0);

  if (f.state.code) return <Success code={f.state.code} total={f.state.total} />;
  const missing = [...(time ? [] : ["Giờ đến"]), ...(freeFit ? [] : ["Bàn trống"]), ...f.checklist.filter((x) => !x.done).map((x) => x.label)];

  return (
    <form ref={formRef} noValidate className="space-y-5" onSubmit={(e) => {
      e.preventDefault();
      setTried(true);
      if (!time || !freeFit) return;
      f.submit({ resourceType: "table", resourceId: tableId === "auto" ? null : tableId, bookingDate: date, bookingTime: time, adults: party, children: 0, note, items: preorder ? orderList.map(({ itemId, qty }) => ({ itemId, qty })) : undefined });
    }}>
      <div data-guide="pick-date">
        <StepTitle n={1} title="Ngày & giờ đến" done={!!time} />
        <DayPicker value={date} onChange={setDate} />
        <div className="mt-2 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700">Giờ đến <span className="text-rose-600">*</span></span>
            <select className="input" value={time} onChange={(e) => setTime(e.target.value)} aria-invalid={tried && !time}>
              {!times.length && <option value="">Hết giờ nhận khách hôm nay</option>}
              {times.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <Stepper label="Số khách" value={party} min={1} onChange={setParty} />
        </div>
        {tried && !time && <InlineError msg="Vui lòng chọn ngày khác (hôm nay đã hết giờ nhận khách)" />}
      </div>

      <div data-guide="pick-table">
        <StepTitle n={2} title={`Chọn bàn · còn ${freeFit} bàn phù hợp`} done={!!freeFit} />
        {err && <InlineError msg={err} />}
        {areas.length > 1 && (
          <div className="mb-2 flex gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Khu vực">
            {areas.map((a) => (
              <button key={a} type="button" role="tab" aria-selected={area === a} onClick={() => setArea(a)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm transition ${area === a ? "bg-white font-semibold shadow-sm" : "text-slate-600"}`}>{a}</button>
            ))}
          </div>
        )}
        {tables && <FloorMap tables={mapTables} onPick={(id) => setTableId(id === tableId ? "auto" : id)} />}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <Legend states={[{ state: "free", label: "Trống" }, { state: "selected", label: "Bạn chọn" }, { state: "busy", label: "Đã có khách" }, { state: "small", label: "Không đủ chỗ" }]} />
          <button type="button" onClick={() => setTableId("auto")} className={`text-xs font-medium ${tableId === "auto" ? "text-emerald-700" : "text-sky-700 underline"}`}>
            {tableId === "auto" ? "✓ Để quán xếp bàn phù hợp" : "Để quán xếp bàn"}
          </button>
        </div>
        {tried && !freeFit && <InlineError msg="Giờ này đã hết bàn phù hợp, vui lòng chọn giờ khác hoặc giảm số khách" />}
      </div>

      {preorder && (
        <div data-guide="preorder">
          <div className="mb-2 text-sm font-semibold text-slate-800">Chọn món trước <span className="font-normal text-slate-400">(không bắt buộc)</span></div>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border p-2">
            {menu.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                <div className="min-w-0"><div className="truncate text-sm font-medium">{m.name}</div><div className="text-xs text-slate-500">{vnd(m.price)}</div></div>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label={`Bớt ${m.name}`} disabled={!order[m.id]} onClick={() => setOrder((o) => ({ ...o, [m.id]: Math.max(0, (o[m.id] ?? 0) - 1) }))} className="flex h-8 w-8 items-center justify-center rounded-md border disabled:opacity-30"><Minus size={14} /></button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums">{order[m.id] ?? 0}</span>
                  <button type="button" aria-label={`Thêm ${m.name}`} onClick={() => setOrder((o) => ({ ...o, [m.id]: (o[m.id] ?? 0) + 1 }))} className="flex h-8 w-8 items-center justify-center rounded-md border"><Plus size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          {orderTotal > 0 && <p className="mt-1 text-right text-sm">Món đặt trước: <b>{vnd(orderTotal)}</b></p>}
        </div>
      )}

      <Checklist items={[{ label: "Giờ đến", done: !!time && !!freeFit }, ...f.checklist]} />
      <ContactInputs f={f} ids={ids} />
      <div>
        <label htmlFor={`${ids}-note`} className="mb-1 block text-xs font-semibold text-slate-700">Ghi chú <span className="font-normal text-slate-400">(không bắt buộc)</span></label>
        <textarea id={`${ids}-note`} className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sinh nhật, cần ghế trẻ em, bàn gần cửa sổ…" maxLength={1000} />
      </div>
      <Consent f={f} ids={ids} text="Tôi đồng ý cung cấp thông tin để quán liên hệ xác nhận giữ bàn." />
      {f.state.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{f.state.error}</p>}
      <Submit loading={f.state.loading} label="Gửi yêu cầu đặt bàn" missing={missing} />
      <p className="text-center text-xs text-slate-500">Bàn được giữ tạm trong lúc chờ quán gọi xác nhận.</p>
    </form>
  );
}

/* ═════════════ ROOMS: ngày nhận / trả + loại phòng ═════════════ */
type RoomType = { id: string; name: string; description: string | null; capacity: number; price: number; total: number; rooms: number; free: number; fits: boolean; tags: string[] };

export function RoomBooking() {
  const ids = useId().replace(/:/g, "");
  const formRef = useRef<HTMLFormElement>(null);
  const f = useContactForm(formRef);
  const today = vnToday();
  const [checkIn, setIn] = useState(addDays(today, 1));
  const [checkOut, setOut] = useState(addDays(today, 2));
  const [guests, setGuests] = useState(2);
  const [res, setRes] = useState<{ nights: number; types: RoomType[] } | null>(null);
  const [typeId, setTypeId] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getJSON<{ nights: number; types: RoomType[] }>(`/api/public/availability?type=rooms&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`);
      setRes(d);
      setErr("");
      setTypeId((cur) => (d.types.some((t) => t.id === cur && t.free > 0 && t.fits) ? cur : ""));
    } catch (e) {
      setErr((e as Error).message);
      setRes(null);
    } finally {
      setLoading(false);
    }
  }, [checkIn, checkOut, guests]);

  useEffect(() => {
    const t = setTimeout(() => void search(), 0);
    return () => clearTimeout(t);
  }, [search]);
  usePick(useCallback((id: string) => setTypeId(id), []));

  const chosen = res?.types.find((t) => t.id === typeId);
  if (f.state.code) return <Success code={f.state.code} total={f.state.total} />;
  const missing = [...(chosen ? [] : ["Loại phòng"]), ...f.checklist.filter((x) => !x.done).map((x) => x.label)];

  return (
    <form ref={formRef} noValidate className="space-y-5" onSubmit={(e) => {
      e.preventDefault();
      setTried(true);
      if (!chosen) return;
      f.submit({ resourceType: "room", itemId: typeId, checkIn, checkOut, adults: guests, children: 0, note });
    }}>
      <div data-guide="pick-date">
        <StepTitle n={1} title="Ngày nhận – trả phòng" done={!!res} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-700"><CalendarDays size={13} className="mr-1 inline" />Nhận phòng (14:00)</span>
            <input type="date" className="input" min={today} value={checkIn} onChange={(e) => { setIn(e.target.value); if (e.target.value >= checkOut) setOut(addDays(e.target.value, 1)); }} /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-700"><CalendarDays size={13} className="mr-1 inline" />Trả phòng (12:00)</span>
            <input type="date" className="input" min={addDays(checkIn, 1)} value={checkOut} onChange={(e) => setOut(e.target.value)} /></label>
          <Stepper label="Số khách" value={guests} min={1} onChange={setGuests} />
        </div>
        {err && <InlineError msg={err} />}
      </div>
      <div data-guide="pick-room">
        <StepTitle n={2} title={`Chọn loại phòng${res ? ` · ${res.nights} đêm` : ""}`} done={!!chosen} />
        <div className={`space-y-2 ${loading ? "opacity-50" : ""}`} role="radiogroup" aria-label="Loại phòng">
          {res?.types.map((t) => {
            const ok = t.free > 0 && t.fits;
            return (
              <button key={t.id} type="button" role="radio" aria-checked={typeId === t.id} disabled={!ok} onClick={() => setTypeId(t.id)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${typeId === t.id ? "border-orange-600 bg-orange-50 ring-2 ring-orange-300" : ok ? "border-slate-200 bg-white hover:border-slate-400" : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"}`}>
                <BedDouble className="shrink-0 text-slate-500" size={22} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{t.name} {t.tags.map((g) => <span key={g} className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">{g}</span>)}</div>
                  <div className="text-xs text-slate-500"><UserRound size={12} className="mr-0.5 inline" />Tối đa {t.capacity} khách · {!t.fits ? "không đủ chỗ cho số khách" : t.free ? <span className="font-medium text-emerald-700">còn {t.free}/{t.rooms} phòng</span> : <span className="text-rose-600">hết phòng</span>}</div>
                </div>
                <div className="text-right"><div className="font-bold">{vnd(t.total)}</div><div className="text-[11px] text-slate-500">{vnd(t.price)}/đêm</div></div>
              </button>
            );
          })}
          {res && !res.types.length && <p className="text-sm text-slate-500">Chưa có loại phòng nào.</p>}
        </div>
        {tried && !chosen && <InlineError msg="Vui lòng chọn một loại phòng còn trống" />}
      </div>
      <Checklist items={[{ label: "Loại phòng", done: !!chosen }, ...f.checklist]} />
      <ContactInputs f={f} ids={ids} />
      <div>
        <label htmlFor={`${ids}-note`} className="mb-1 block text-xs font-semibold text-slate-700">Ghi chú <span className="font-normal text-slate-400">(không bắt buộc)</span></label>
        <textarea id={`${ids}-note`} className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Giờ đến dự kiến, cần giường phụ…" maxLength={1000} />
      </div>
      <Consent f={f} ids={ids} text="Tôi đồng ý cung cấp thông tin để khách sạn liên hệ xác nhận đặt phòng." />
      {chosen && (
        <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
          <span className="text-sm text-slate-300">{chosen.name} · {res?.nights} đêm</span>
          <span className="text-lg font-bold">{vnd(chosen.total)}</span>
        </div>
      )}
      {f.state.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{f.state.error}</p>}
      <Submit loading={f.state.loading} label="Gửi yêu cầu đặt phòng" missing={missing} />
      <button type="button" onClick={() => void search()} className="mx-auto flex items-center gap-1 text-xs text-sky-700 hover:underline"><Search size={12} /> Cập nhật phòng trống</button>
    </form>
  );
}
