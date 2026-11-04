"use client";
/**
 * Form đặt tour / tư vấn với gợi ý trường bắt buộc:
 *  - Checklist "thông tin bắt buộc" + thanh tiến độ, cập nhật trực tiếp
 *  - Kiểm tra khi rời ô (blur), lỗi hiển thị ngay dưới ô (aria-describedby, aria-invalid)
 *  - Bấm gửi khi còn thiếu: rung form, đưa con trỏ tới ô đầu tiên cần sửa
 *  - Họ tên + (SĐT hoặc email, ưu tiên SĐT) + đồng ý liên hệ
 */
import { AlertCircle, Check, CheckCircle2, Circle, Mail, Phone, PhoneCall, User } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { dateVN, vnd } from "@/lib/format";

type Departure = { id: string; departDate: string; seatsTotal: number; seatsBooked: number; price: number | null; status: string };
type Tour = { id: string; title: string; basePrice: number; childPrice: number; departures: Departure[] };

/* ─────────── Kiểm tra dữ liệu (giống server) ─────────── */
const normPhone = (p: string) => {
  let s = p.replace(/[\s.\-()]/g, "");
  if (s.startsWith("+84")) s = "0" + s.slice(3);
  return s;
};
const phoneOk = (p: string) => /^0\d{9,10}$/.test(normPhone(p));
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

type Contact = { fullName: string; phone: string; email: string; consent: boolean };

function validate(c: Contact) {
  const e: Partial<Record<keyof Contact, string>> = {};
  if (c.fullName.trim().length < 2) e.fullName = "Vui lòng nhập họ và tên (ít nhất 2 ký tự)";
  if (c.phone && !phoneOk(c.phone)) e.phone = "Số điện thoại chưa đúng, ví dụ: 0901 234 567";
  if (c.email && !emailOk(c.email)) e.email = "Email chưa đúng định dạng, ví dụ: ten@gmail.com";
  if (!c.phone && !c.email) e.phone = "Cần số điện thoại (ưu tiên) hoặc email để nhân viên liên hệ xác nhận";
  if (!c.consent) e.consent = "Vui lòng đồng ý để chúng tôi liên hệ xác nhận đặt chỗ";
  return e;
}

/* ─────────── UI phụ ─────────── */
function FieldShell({ id, label, required, hint, error, ok, icon, children }: { id: string; label: string; required?: boolean; hint?: ReactNode; error?: string; ok?: boolean; icon?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="text-rose-600" aria-hidden>*</span>}
        {required && <span className="sr-only">(bắt buộc)</span>}
      </label>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
        {children}
        {ok && !error && <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600" aria-hidden />}
      </div>
      {error ? (
        <p id={`${id}-err`} className="mt-1 flex items-start gap-1 text-xs font-medium text-rose-600" role="alert">
          <AlertCircle size={13} className="mt-px shrink-0" /> {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checklist({ items }: { items: { label: string; done: boolean }[] }) {
  const done = items.filter((x) => x.done).length;
  const pct = Math.round((done / items.length) * 100);
  return (
    <div data-guide="required" className="rounded-xl border border-sky-100 bg-sky-50/70 p-3" aria-live="polite">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700">
        <span>Thông tin bắt buộc</span>
        <span className={pct === 100 ? "text-emerald-700" : "text-slate-500"}>{pct === 100 ? "Đủ, có thể gửi ✓" : `${done}/${items.length}`}</span>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-sky-100">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <ul className="grid gap-1 text-xs sm:grid-cols-3">
        {items.map((x) => (
          <li key={x.label} className={`flex items-center gap-1.5 ${x.done ? "text-emerald-700" : "text-slate-500"}`}>
            {x.done ? <CheckCircle2 size={14} /> : <Circle size={14} />} {x.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Success({ code, total }: { code: string; total: number }) {
  return (
    <div className="pop-in rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center" role="status">
      <CheckCircle2 className="mx-auto text-emerald-600" size={48} />
      <h3 className="mt-3 text-lg font-semibold">Đã nhận yêu cầu!</h3>
      <p className="mt-1 text-sm text-slate-600">Mã yêu cầu: <b className="font-mono">{code}</b></p>
      {total > 0 && <p className="text-sm text-slate-600">Tạm tính: <b>{vnd(total)}</b></p>}
      <ol className="mx-auto mt-4 max-w-xs space-y-1.5 text-left text-sm text-slate-600">
        <li className="flex gap-2"><PhoneCall size={16} className="mt-0.5 shrink-0 text-emerald-600" /> Nhân viên gọi xác nhận chỗ trong giờ làm việc</li>
        <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> Nhận mã QR thanh toán qua Zalo/SMS</li>
      </ol>
    </div>
  );
}

/* ─────────── Hook gửi + quản lý lỗi ─────────── */
export function useContactForm(formRef: React.RefObject<HTMLFormElement | null>, initial?: Partial<Contact>) {
  const [c, setC] = useState<Contact>({ fullName: "", phone: "", email: "", consent: true, ...initial });
  const [touched, setTouched] = useState<Partial<Record<keyof Contact, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [state, setState] = useState({ loading: false, error: "", code: "", total: 0 });
  // Rung form để báo lỗi (kích hoạt lại animation mà không mount lại form => giữ focus)
  const shake = () => {
    const el = formRef.current;
    if (!el) return;
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  };
  const errors = validate(c);
  const show = (k: keyof Contact) => (touched[k] || submitted ? errors[k] : undefined);
  const set = <K extends keyof Contact>(k: K, v: Contact[K]) => setC((s) => ({ ...s, [k]: v }));
  const blur = (k: keyof Contact) => () => setTouched((t) => ({ ...t, [k]: true }));

  async function submit(extra: Record<string, unknown>) {
    setSubmitted(true);
    const keys = Object.keys(errors) as (keyof Contact)[];
    if (keys.length) {
      shake();
      const first = formRef.current?.querySelector<HTMLElement>(`[name="${keys[0]}"]`);
      first?.focus();
      return;
    }
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const r = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...extra, fullName: c.fullName, phone: c.phone, email: c.email, consent: c.consent }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gửi yêu cầu thất bại");
      setState({ loading: false, error: "", code: j.data.code, total: j.data.estimatedTotal });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
      shake();
    }
  }
  const checklist = [
    { label: "Họ và tên", done: !errors.fullName },
    { label: "SĐT hoặc email", done: !!(c.phone || c.email) && !errors.phone && !errors.email },
    { label: "Đồng ý liên hệ", done: c.consent },
  ];
  return { c, set, blur, show, errors, submit, state, checklist };
}

export function ContactInputs({ f, ids }: { f: ReturnType<typeof useContactForm>; ids: string }) {
  const { c, set, blur, show } = f;
  const aria = (k: string, err?: string) => ({ "aria-invalid": !!err, "aria-describedby": `${ids}-${k}-${err ? "err" : "hint"}` });
  const ePhone = show("phone");
  return (
    <div data-guide="contact" className="space-y-3">
      <FieldShell id={`${ids}-fullName`} label="Họ và tên" required error={show("fullName")} ok={c.fullName.trim().length >= 2} icon={<User size={15} />}>
        <input id={`${ids}-fullName`} name="fullName" className="input pl-9 pr-9" autoComplete="name" value={c.fullName}
          onChange={(e) => set("fullName", e.target.value)} onBlur={blur("fullName")} {...aria("fullName", show("fullName"))} />
      </FieldShell>
      <FieldShell id={`${ids}-phone`} label="Số điện thoại" required={!c.email}
        hint={<>Ưu tiên SĐT để nhân viên <b>gọi xác nhận</b>. Có thể dùng email thay thế.</>}
        error={ePhone} ok={!!c.phone && phoneOk(c.phone)} icon={<Phone size={15} />}>
        <input id={`${ids}-phone`} name="phone" className="input pl-9 pr-9" type="tel" inputMode="tel" autoComplete="tel" placeholder="0901 234 567"
          value={c.phone} onChange={(e) => set("phone", e.target.value)} onBlur={blur("phone")} {...aria("phone", ePhone)} />
      </FieldShell>
      <FieldShell id={`${ids}-email`} label={c.phone ? "Email (không bắt buộc)" : "Email (nếu không có SĐT)"} error={show("email")} ok={!!c.email && emailOk(c.email)} icon={<Mail size={15} />}>
        <input id={`${ids}-email`} name="email" className="input pl-9 pr-9" type="email" autoComplete="email" placeholder="ten@gmail.com"
          value={c.email} onChange={(e) => set("email", e.target.value)} onBlur={blur("email")} {...aria("email", show("email"))} />
      </FieldShell>
    </div>
  );
}

export function Consent({ f, ids, text }: { f: ReturnType<typeof useContactForm>; ids: string; text: string }) {
  const err = f.show("consent");
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-600">
        <input name="consent" type="checkbox" className="mt-0.5 h-4 w-4 accent-orange-600" checked={f.c.consent}
          onChange={(e) => f.set("consent", e.target.checked)} aria-invalid={!!err} aria-describedby={err ? `${ids}-consent-err` : undefined} />
        <span>{text} <span className="text-rose-600" aria-hidden>*</span></span>
      </label>
      {err && <p id={`${ids}-consent-err`} className="mt-1 text-xs font-medium text-rose-600" role="alert">{err}</p>}
    </div>
  );
}

export function Submit({ loading, label, missing }: { loading: boolean; label: string; missing: string[] }) {
  return (
    <div data-guide="submit">
      <button disabled={loading} className="group relative w-full overflow-hidden rounded-xl bg-orange-600 py-3.5 font-semibold text-slate-950 shadow-lg shadow-orange-600/25 transition hover:-translate-y-0.5 hover:bg-orange-500 active:translate-y-0 disabled:opacity-60">
        <span className="relative">{loading ? "Đang gửi…" : label}</span>
      </button>
      {missing.length > 0 && <p className="mt-1.5 text-center text-xs text-slate-500">Còn thiếu: <b className="text-slate-700">{missing.join(", ")}</b></p>}
    </div>
  );
}

/* ─────────── Form đặt tour ─────────── */
export function BookingForm({ tour }: { tour: Tour }) {
  const ids = useId().replace(/:/g, "");
  const open = tour.departures.filter((d) => d.status === "open" && d.seatsTotal > d.seatsBooked);
  const [slotId, setSlot] = useState(open[0]?.id ?? "");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const f = useContactForm(formRef);
  const dep = open.find((d) => d.id === slotId);
  const left = dep ? dep.seatsTotal - dep.seatsBooked : null;
  const adultPrice = dep?.price ?? tour.basePrice;
  const total = adultPrice * adults + (tour.childPrice || adultPrice) * children;
  const overCapacity = left !== null && adults + children > left;

  if (f.state.code) return <Success code={f.state.code} total={f.state.total} />;
  const missing = f.checklist.filter((x) => !x.done).map((x) => x.label);

  return (
    <form ref={formRef} noValidate className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (overCapacity) return;
        f.submit({ resourceType: "tour", resourceId: tour.id, slotId: slotId || null, adults, children, note, website });
      }}>
      <div data-guide="date">
        <label htmlFor={`${ids}-date`} className="mb-1 block text-xs font-semibold text-slate-700">Ngày khởi hành</label>
        <select id={`${ids}-date`} className="input" value={slotId} onChange={(e) => setSlot(e.target.value)}>
          {open.map((d) => (
            <option key={d.id} value={d.id}>
              {dateVN(d.departDate)} · còn {d.seatsTotal - d.seatsBooked} chỗ · {vnd(d.price ?? tour.basePrice)}
            </option>
          ))}
          <option value="">Ngày khác: nhờ tư vấn</option>
        </select>
      </div>
      <div data-guide="people" className="grid grid-cols-2 gap-3">
        <Stepper label="Người lớn" value={adults} min={1} onChange={setAdults} />
        <Stepper label="Trẻ em (2–11t)" value={children} min={0} onChange={setChildren} />
      </div>
      {overCapacity && <p className="text-xs font-medium text-rose-600" role="alert">Ngày này chỉ còn {left} chỗ, vui lòng giảm số khách hoặc chọn ngày khác.</p>}
      <Checklist items={f.checklist} />
      <ContactInputs f={f} ids={ids} />
      <div>
        <label htmlFor={`${ids}-note`} className="mb-1 block text-xs font-semibold text-slate-700">Ghi chú <span className="font-normal text-slate-400">(không bắt buộc)</span></label>
        <textarea id={`${ids}-note`} className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ăn chay, phòng tầng thấp, giờ gọi thuận tiện…" maxLength={1000} />
      </div>
      <input tabIndex={-1} autoComplete="off" className="hidden" value={website} onChange={(e) => setWebsite(e.target.value)} aria-hidden />
      <Consent f={f} ids={ids} text="Tôi đồng ý cung cấp thông tin để được liên hệ xác nhận đặt chỗ (NĐ 13/2023/NĐ-CP)." />
      <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
        <span className="text-sm text-slate-300">Tạm tính · {adults + children} khách</span>
        <span className="text-xl font-bold tabular-nums">{vnd(total)}</span>
      </div>
      {f.state.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{f.state.error}</p>}
      <Submit loading={f.state.loading} label="Gửi yêu cầu đặt tour" missing={missing} />
      <p className="text-center text-xs text-slate-500">Chưa cần thanh toán. Chỗ được giữ sau khi nhân viên gọi xác nhận.</p>
    </form>
  );
}

export function Stepper({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (v: number) => void }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
      <div className="flex h-11 items-center justify-between rounded-lg border border-slate-300 bg-white px-1">
        <button type="button" className="h-9 w-9 rounded-md text-lg text-slate-600 transition hover:bg-slate-100 disabled:opacity-30" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Giảm ${label}`}>−</button>
        <span className="min-w-6 text-center font-semibold tabular-nums" aria-live="polite">{value}</span>
        <button type="button" className="h-9 w-9 rounded-md text-lg text-slate-600 transition hover:bg-slate-100 disabled:opacity-30" disabled={value >= 50} onClick={() => onChange(value + 1)} aria-label={`Tăng ${label}`}>+</button>
      </div>
    </div>
  );
}

/* ─────────── Form tư vấn (trang chủ) ─────────── */
export function ContactForm() {
  const ids = useId().replace(/:/g, "");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const f = useContactForm(formRef);
  if (f.state.code) return <Success code={f.state.code} total={0} />;
  const missing = f.checklist.filter((x) => !x.done).map((x) => x.label);
  return (
    <form ref={formRef} noValidate data-guide="consult" className="card space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        f.submit({ resourceType: "service", note, website, adults: 1 });
      }}>
      <Checklist items={f.checklist} />
      <ContactInputs f={f} ids={ids} />
      <div>
        <label htmlFor={`${ids}-need`} className="mb-1 block text-xs font-semibold text-slate-700">Nhu cầu <span className="font-normal text-slate-400">(không bắt buộc)</span></label>
        <textarea id={`${ids}-need`} className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Đoàn 25 khách, đi Đà Nẵng 3 ngày cuối tháng…" maxLength={1000} />
      </div>
      <input tabIndex={-1} autoComplete="off" className="hidden" value={website} onChange={(e) => setWebsite(e.target.value)} aria-hidden />
      <Consent f={f} ids={ids} text="Tôi đồng ý được liên hệ tư vấn." />
      {f.state.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{f.state.error}</p>}
      <Submit loading={f.state.loading} label="Gửi yêu cầu tư vấn" missing={missing} />
    </form>
  );
}
