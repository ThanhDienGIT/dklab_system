"use client";
import { CheckCircle2, Phone } from "lucide-react";
import { useState } from "react";
import { dateVN, vnd } from "@/lib/format";

type Departure = { id: string; departDate: string; seatsTotal: number; seatsBooked: number; price: number | null; status: string };

type Props = {
  mode: "tour" | "service";
  tour?: { id: string; title: string; basePrice: number; childPrice: number; departures: Departure[] };
};

function useSubmit() {
  const [state, setState] = useState<{ loading: boolean; error: string; code: string; total: number }>({ loading: false, error: "", code: "", total: 0 });
  async function submit(body: Record<string, unknown>) {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const r = await fetch("/api/public/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gửi yêu cầu thất bại");
      setState({ loading: false, error: "", code: j.data.code, total: j.data.estimatedTotal });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
    }
  }
  return { state, submit };
}

function Success({ code, total }: { code: string; total: number }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
      <CheckCircle2 className="mx-auto text-emerald-600" size={44} />
      <h3 className="mt-3 text-lg font-semibold">Đã nhận yêu cầu!</h3>
      <p className="mt-1 text-sm text-slate-600">Mã yêu cầu: <b>{code}</b></p>
      {total > 0 && <p className="text-sm text-slate-600">Tạm tính: <b>{vnd(total)}</b></p>}
      <p className="mt-3 text-sm text-slate-600">Nhân viên sẽ <b>gọi điện xác nhận</b> chỗ và gửi thông tin thanh toán. Chỗ chỉ được giữ sau khi xác nhận.</p>
    </div>
  );
}

function ContactFields({ f, set }: { f: Record<string, string>; set: (k: string, v: string) => void }) {
  return (
    <>
      <label className="block">
        <span className="label">Họ và tên *</span>
        <input className="input" required minLength={2} autoComplete="name" value={f.fullName} onChange={(e) => set("fullName", e.target.value)} />
      </label>
      <label className="block">
        <span className="label">Số điện thoại <span className="text-brand">(ưu tiên, để nhân viên gọi xác nhận)</span></span>
        <div className="relative">
          <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" type="tel" inputMode="tel" autoComplete="tel" placeholder="0901 234 567" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
      </label>
      <label className="block">
        <span className="label">Email {f.phone ? "(không bắt buộc)" : "(nếu không có SĐT)"}</span>
        <input className="input" type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
      </label>
    </>
  );
}

export function BookingForm({ tour }: Required<Pick<Props, "tour">>) {
  const open = tour.departures.filter((d) => d.status === "open" && d.seatsTotal > d.seatsBooked);
  const [f, setF] = useState({ fullName: "", phone: "", email: "", note: "", slotId: open[0]?.id ?? "", adults: "2", children: "0", website: "" });
  const [consent, setConsent] = useState(true);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const { state, submit } = useSubmit();
  const dep = open.find((d) => d.id === f.slotId);
  const adultPrice = dep?.price ?? tour.basePrice;
  const total = adultPrice * +f.adults + (tour.childPrice || adultPrice) * +f.children;

  if (state.code) return <Success code={state.code} total={state.total} />;
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.phone && !f.email) return alert("Vui lòng để lại số điện thoại hoặc email");
        submit({ resourceType: "tour", resourceId: tour.id, slotId: f.slotId || null, adults: +f.adults, children: +f.children, fullName: f.fullName, phone: f.phone, email: f.email, note: f.note, consent, website: f.website });
      }}
    >
      <label className="block">
        <span className="label">Ngày khởi hành</span>
        <select className="input" value={f.slotId} onChange={(e) => set("slotId", e.target.value)}>
          {open.map((d) => <option key={d.id} value={d.id}>{dateVN(d.departDate)} – còn {d.seatsTotal - d.seatsBooked} chỗ</option>)}
          <option value="">Ngày khác (nhờ tư vấn)</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="label">Người lớn</span><input className="input" type="number" min={1} max={50} value={f.adults} onChange={(e) => set("adults", e.target.value)} /></label>
        <label className="block"><span className="label">Trẻ em (2–11t)</span><input className="input" type="number" min={0} max={50} value={f.children} onChange={(e) => set("children", e.target.value)} /></label>
      </div>
      <ContactFields f={f} set={set} />
      <label className="block"><span className="label">Ghi chú</span><textarea className="input" rows={2} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Yêu cầu phòng, ăn chay, giờ gọi thuận tiện…" /></label>
      <input tabIndex={-1} autoComplete="off" className="hidden" value={f.website} onChange={(e) => set("website", e.target.value)} aria-hidden />
      <label className="flex items-start gap-2 text-xs text-slate-600">
        <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        Tôi đồng ý cung cấp thông tin để được liên hệ xác nhận đặt chỗ (theo NĐ 13/2023/NĐ-CP).
      </label>
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
        <span className="text-sm text-slate-600">Tạm tính</span>
        <span className="text-xl font-bold text-brand">{vnd(total)}</span>
      </div>
      {state.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>}
      <button disabled={state.loading || !consent} className="w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
        {state.loading ? "Đang gửi…" : "Gửi yêu cầu đặt tour"}
      </button>
      <p className="text-center text-xs text-slate-500">Chưa cần thanh toán. Nhân viên sẽ gọi xác nhận trước.</p>
    </form>
  );
}

export function ContactForm() {
  const [f, setF] = useState({ fullName: "", phone: "", email: "", note: "", website: "" });
  const [consent, setConsent] = useState(true);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const { state, submit } = useSubmit();
  if (state.code) return <Success code={state.code} total={0} />;
  return (
    <form
      className="card space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.phone && !f.email) return alert("Vui lòng để lại số điện thoại hoặc email");
        submit({ resourceType: "service", fullName: f.fullName, phone: f.phone, email: f.email, note: f.note, consent, website: f.website, adults: 1 });
      }}
    >
      <ContactFields f={f} set={set} />
      <label className="block"><span className="label">Nhu cầu</span><textarea className="input" rows={3} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="VD: Đoàn 25 khách, đi Đà Nẵng 3 ngày cuối tháng…" /></label>
      <input tabIndex={-1} autoComplete="off" className="hidden" value={f.website} onChange={(e) => set("website", e.target.value)} aria-hidden />
      <label className="flex items-start gap-2 text-xs text-slate-600">
        <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Tôi đồng ý được liên hệ tư vấn.
      </label>
      {state.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>}
      <button disabled={state.loading || !consent} className="w-full rounded-xl bg-brand py-3 font-semibold text-white disabled:opacity-60">{state.loading ? "Đang gửi…" : "Gửi yêu cầu tư vấn"}</button>
    </form>
  );
}
