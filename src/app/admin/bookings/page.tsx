"use client";
import { CalendarDays, Mail, MessageCircle, PhoneCall, Plus, Receipt, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePerm } from "@/components/admin/AdminShell";
import { Guide, type GuideStep } from "@/components/Guide";
import { BOOKING_STATUS } from "@/components/admin/status";
import { Badge, Button, cx, Empty, Field, Modal, PageHeader, Skeleton, useToast } from "@/components/ui";
import { dateVN, telHref, timeAgo, vnd, zaloHref } from "@/lib/format";
import { errorMessage, useBookingsQuery, useCreateBookingMutation, useDeleteBookingMutation, useMeQuery, useTourQuery, useToursQuery, useUpdateBookingMutation } from "@/store/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setBookingFilter } from "@/store/store";
import type { Booking, BookingStatus } from "@/store/types";

const TABS = ["new", "contacted", "confirmed", "completed", "cancelled", "all"] as const;

const GUIDE: GuideStep[] = [
  { target: "tabs", title: "Lọc theo trạng thái", body: "“Mới – chờ gọi” là khách vừa gửi yêu cầu từ website. Danh sách tự làm mới mỗi 30 giây." },
  { target: "call", title: "Gọi khách ngay", body: "Bấm số điện thoại để gọi (trên điện thoại) hoặc nhắn Zalo. Khách để lại SĐT là để được gọi xác nhận." },
  { target: "actions", title: "Cập nhật trạng thái", body: "Đã gọi → “Đã gọi / đang tư vấn”. Khách đồng ý → “Xác nhận giữ chỗ” (hệ thống mới trừ chỗ). Sau đó “Lập hóa đơn” để gửi QR thanh toán." },
  { target: "add", title: "Khách gọi điện đặt?", body: "Bấm nút này để tự thêm đặt chỗ. Ô có dấu * là bắt buộc; cần ít nhất SĐT hoặc email." },
];

export default function BookingsPage() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.ui.bookingFilter);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data: me } = useMeQuery();
  const { data, isLoading, isFetching } = useBookingsQuery({ status, q: search || undefined }, { pollingInterval: 30_000 });
  const [creating, setCreating] = useState(false);
  const can = usePerm();

  return (
    <>
      <PageHeader
        title={`Danh sách ${me?.labels.booking.toLowerCase() ?? "đặt chỗ"}`}
        desc="Khách để lại SĐT/email trên website → lễ tân gọi xác nhận thì mới giữ chỗ"
        actions={can("booking.handle") && <Button data-guide="add" onClick={() => setCreating(true)}><Plus size={16} /> Thêm đặt chỗ (khách gọi)</Button>}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div data-guide="tabs" className="flex gap-1 overflow-x-auto rounded-lg bg-slate-200/60 p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => dispatch(setBookingFilter(t))}
              className={cx("whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition", status === t ? "bg-white font-medium shadow-sm" : "text-slate-600 hover:text-slate-900")}
            >
              {t === "all" ? "Tất cả" : BOOKING_STATUS[t].label}
              {t !== "all" && !!data?.counts[t] && <span className="ml-1 text-xs text-slate-400">{data.counts[t]}</span>}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setSearch(q); }} className="relative sm:ml-auto sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Tìm tên, SĐT, email, mã…" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
      </div>

      {isLoading ? (
        <Skeleton />
      ) : !data?.items.length ? (
        <Empty>Không có yêu cầu nào{status !== "all" ? ` ở trạng thái "${BOOKING_STATUS[status]?.label}"` : ""}.</Empty>
      ) : (
        <div className={cx("grid gap-3 md:grid-cols-2", isFetching && "opacity-70")}>
          {data.items.map((b, i) => <BookingCard key={b.id} b={b} first={i === 0} />)}
        </div>
      )}
      <CreateBookingModal open={creating} onClose={() => setCreating(false)} />
      <Guide steps={GUIDE} storageKey="admin-bookings" />
    </>
  );
}

function BookingCard({ b, first }: { b: Booking; first?: boolean }) {
  const [update, { isLoading }] = useUpdateBookingMutation();
  const [del] = useDeleteBookingMutation();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(b.staffNote ?? "");
  const toast = useToast();
  const can = usePerm();

  async function setStatus(status: BookingStatus, extra?: Partial<Booking>) {
    try {
      await update({ id: b.id, status, ...extra }).unwrap();
      toast(`${b.code}: ${BOOKING_STATUS[status].label}`);
    } catch (e) {
      toast(errorMessage(e), "err");
    }
  }

  return (
    <div className={cx("card p-4", b.status === "new" && "border-rose-200 ring-1 ring-rose-100")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold">{b.fullName}</div>
          <div className="text-xs text-slate-500">{b.code} · {timeAgo(b.createdAt)} · {b.source === "website" ? "Website" : b.source}</div>
        </div>
        <Badge color={BOOKING_STATUS[b.status].color}>{BOOKING_STATUS[b.status].label}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {b.phone ? (
          <a data-guide={first ? "call" : undefined} href={telHref(b.phone)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
            <PhoneCall size={15} /> {b.phone}
          </a>
        ) : (
          <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700">Không có SĐT – liên hệ qua email</span>
        )}
        {b.phone && (
          <a href={zaloHref(b.phone)} target="_blank" className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-sm text-sky-700 hover:bg-sky-50">
            <MessageCircle size={15} /> Zalo
          </a>
        )}
        {b.email && (
          <a href={`mailto:${b.email}`} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            <Mail size={15} /> {b.email}
          </a>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="col-span-2 truncate font-medium text-slate-800">{b.resourceLabel ?? "—"}</dt>
        <dd className="flex items-center gap-1 text-slate-600"><CalendarDays size={14} /> {b.bookingDate ? dateVN(b.bookingDate) : "Chưa chọn ngày"} {b.bookingTime}</dd>
        <dd className="flex items-center gap-1 text-slate-600"><Users size={14} /> {b.adults} NL{b.children ? ` + ${b.children} TE` : ""}</dd>
        {b.estimatedTotal > 0 && <dd className="col-span-2 text-slate-600">Tạm tính: <b className="text-slate-900">{vnd(b.estimatedTotal)}</b></dd>}
      </dl>
      {b.note && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">“{b.note}”</p>}
      {b.staffNote && <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900"><b>Ghi chú NV:</b> {b.staffNote}</p>}
      {b.assigneeName && <p className="mt-2 text-xs text-slate-500">Người xử lý: {b.assigneeName}</p>}

      {can("booking.handle") && (
        <div data-guide={first ? "actions" : undefined} className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
          {b.status === "new" && <Button size="sm" variant="secondary" loading={isLoading} onClick={() => setStatus("contacted")}>Đã gọi / đang tư vấn</Button>}
          {(b.status === "new" || b.status === "contacted") && <Button size="sm" variant="success" loading={isLoading} onClick={() => setStatus("confirmed")}>Xác nhận giữ chỗ</Button>}
          {b.status === "confirmed" && <Button size="sm" variant="secondary" onClick={() => setStatus("completed")}>Hoàn tất</Button>}
          {b.status !== "cancelled" && b.status !== "completed" && <Button size="sm" variant="ghost" onClick={() => confirm("Hủy yêu cầu này?") && setStatus("cancelled")}>Hủy</Button>}
          <Button size="sm" variant="ghost" onClick={() => setNoteOpen(true)}>Ghi chú</Button>
          {can("invoice.create") && (b.status === "confirmed" || b.status === "completed") && (
            <Link href={`/admin/invoices/new?bookingId=${b.id}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-brand/10">
              <Receipt size={14} /> Lập hóa đơn
            </Link>
          )}
          {can("booking.delete") && (
            <button
              className="ml-auto rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              title="Xóa"
              onClick={async () => {
                if (!confirm(`Xóa yêu cầu ${b.code}?`)) return;
                try { await del(b.id).unwrap(); toast("Đã xóa"); } catch (e) { toast(errorMessage(e), "err"); }
              }}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )}
      <Modal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title={`Ghi chú – ${b.code}`}
        footer={<Button loading={isLoading} onClick={async () => { await setStatus(b.status, { staffNote: note }); setNoteOpen(false); }}>Lưu</Button>}
      >
        <textarea className="input min-h-28" value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Khách hẹn gọi lại 18h, muốn phòng đôi…" />
      </Modal>
    </div>
  );
}

function CreateBookingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: tours } = useToursQuery(undefined, { skip: !open });
  const [f, setF] = useState({ fullName: "", phone: "", email: "", resourceId: "", slotId: "", adults: 2, children: 0, note: "", source: "phone" });
  const { data: tour } = useTourQuery(f.resourceId, { skip: !f.resourceId });
  const [create, { isLoading }] = useCreateBookingMutation();
  const toast = useToast();
  const set = (k: string, v: unknown) => setF((s) => ({ ...s, [k]: v }));

  async function submit() {
    try {
      const dep = tour?.departures.find((d) => d.id === f.slotId);
      const price = dep?.price ?? tour?.basePrice ?? 0;
      await create({
        resourceType: "tour",
        resourceId: f.resourceId || null,
        slotId: f.slotId || null,
        bookingDate: dep?.departDate ?? null,
        fullName: f.fullName,
        phone: f.phone,
        email: f.email,
        adults: f.adults,
        children: f.children,
        note: f.note,
        source: f.source,
        estimatedTotal: price * f.adults + (tour?.childPrice || price) * f.children,
      }).unwrap();
      toast("Đã thêm đặt chỗ");
      onClose();
      setF({ fullName: "", phone: "", email: "", resourceId: "", slotId: "", adults: 2, children: 0, note: "", source: "phone" });
    } catch (e) {
      toast(errorMessage(e), "err");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Thêm đặt chỗ" footer={<><Button variant="secondary" onClick={onClose}>Đóng</Button><Button loading={isLoading} onClick={submit}>Lưu</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field required label="Họ tên khách" className="sm:col-span-2"><input className="input" value={f.fullName} onChange={(e) => set("fullName", e.target.value)} /></Field>
        <Field label="Số điện thoại (ưu tiên)" hint="Cần SĐT hoặc email"><input className="input" inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Email"><input className="input" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Tour" className="sm:col-span-2">
          <select className="input" value={f.resourceId} onChange={(e) => setF((s) => ({ ...s, resourceId: e.target.value, slotId: "" }))}>
            <option value="">— Chọn tour —</option>
            {tours?.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </Field>
        {tour && (
          <Field label="Ngày khởi hành" className="sm:col-span-2">
            <select className="input" value={f.slotId} onChange={(e) => set("slotId", e.target.value)}>
              <option value="">— Chưa chọn —</option>
              {tour.departures.filter((d) => d.status === "open").map((d) => (
                <option key={d.id} value={d.id}>{dateVN(d.departDate)} – còn {d.seatsTotal - d.seatsBooked} chỗ – {vnd(d.price ?? tour.basePrice)}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Người lớn"><input className="input" type="number" min={1} value={f.adults} onChange={(e) => set("adults", +e.target.value)} /></Field>
        <Field label="Trẻ em"><input className="input" type="number" min={0} value={f.children} onChange={(e) => set("children", +e.target.value)} /></Field>
        <Field label="Nguồn">
          <select className="input" value={f.source} onChange={(e) => set("source", e.target.value)}>
            <option value="phone">Điện thoại</option><option value="walk_in">Đến trực tiếp</option><option value="zalo">Zalo</option><option value="facebook">Facebook</option>
          </select>
        </Field>
        <Field label="Ghi chú" className="sm:col-span-2"><textarea className="input" value={f.note} onChange={(e) => set("note", e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
