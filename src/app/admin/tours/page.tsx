"use client";
import { CalendarPlus, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { usePerm } from "@/components/admin/AdminShell";
import { Badge, Button, Empty, Field, Modal, PageHeader, Skeleton, useToast } from "@/components/ui";
import { dateVN, vnd } from "@/lib/format";
import { errorMessage, useDeleteDepartureMutation, useDeleteTourMutation, useSaveDepartureMutation, useSaveTourMutation, useTourQuery, useToursQuery } from "@/store/api";
import type { Tour } from "@/store/types";

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);

export default function ToursPage() {
  const { data, isLoading } = useToursQuery();
  const [editing, setEditing] = useState<Partial<Tour> | null>(null);
  const [schedule, setSchedule] = useState<string | null>(null);
  const can = usePerm();
  return (
    <>
      <PageHeader title="Tour du lịch" desc="Sửa tour/lịch khởi hành → website cập nhật ngay (xóa cache tự động)"
        actions={can("tour.manage") && <Button onClick={() => setEditing({ durationDays: 2, durationNights: 1, highlights: [], itinerary: [], isPublished: true })}><Plus size={16} /> Thêm tour</Button>} />
      {isLoading ? <Skeleton /> : !data?.length ? <Empty>Chưa có tour.</Empty> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((t) => (
            <div key={t.id} className="card flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-snug">{t.title}</h3>
                {!t.isPublished && <Badge>Ẩn</Badge>}
              </div>
              <p className="mt-1 text-xs text-slate-500">{t.location} · {t.durationDays}N{t.durationNights}Đ · Từ {t.departFrom}</p>
              <p className="mt-2 text-lg font-semibold text-brand">{vnd(t.basePrice)}</p>
              <p className="text-xs text-slate-500">{t.upcomingDepartures} lịch sắp tới · còn {t.seatsLeft} chỗ</p>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                <Button size="sm" variant="secondary" onClick={() => setSchedule(t.id)}><CalendarPlus size={14} /> Lịch khởi hành</Button>
                {can("tour.manage") && <Button size="sm" variant="ghost" onClick={() => setEditing(t)}>Sửa</Button>}
                <a href={`/tours/${t.slug}`} target="_blank" className="ml-auto rounded p-1.5 text-slate-400 hover:text-brand" title="Xem trên web"><ExternalLink size={15} /></a>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <TourForm value={editing} onClose={() => setEditing(null)} />}
      {schedule && <Departures tourId={schedule} onClose={() => setSchedule(null)} />}
    </>
  );
}

function TourForm({ value, onClose }: { value: Partial<Tour>; onClose: () => void }) {
  const [f, setF] = useState<Partial<Tour>>(value);
  const [hl, setHl] = useState((value.highlights ?? []).join("\n"));
  const [save, { isLoading }] = useSaveTourMutation();
  const [del] = useDeleteTourMutation();
  const toast = useToast();
  const b = (k: keyof Tour) => ({ value: (f[k] as string | number) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value })) });
  const itin = f.itinerary ?? [];
  const setItin = (i: number, k: "day" | "title" | "detail", v: string) => setF((s) => ({ ...s, itinerary: itin.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));

  async function submit() {
    try {
      await save({
        ...f,
        slug: f.slug || slugify(f.title ?? ""),
        durationDays: Number(f.durationDays), durationNights: Number(f.durationNights),
        basePrice: Number(f.basePrice ?? 0), childPrice: Number(f.childPrice ?? 0), sortOrder: Number(f.sortOrder ?? 0),
        highlights: hl.split("\n").map((x) => x.trim()).filter(Boolean),
      }).unwrap();
      toast("Đã lưu tour");
      onClose();
    } catch (e) { toast(errorMessage(e), "err"); }
  }
  return (
    <Modal open onClose={onClose} wide title={value.id ? "Sửa tour" : "Thêm tour"}
      footer={<>
        {value.id && <Button variant="ghost" className="mr-auto text-rose-600" onClick={async () => { if (confirm("Xóa tour này và toàn bộ lịch khởi hành?")) { await del(value.id!); onClose(); } }}>Xóa tour</Button>}
        <Button loading={isLoading} onClick={submit}>Lưu</Button>
      </>}>
      <div className="grid gap-3 sm:grid-cols-6">
        <Field required label="Tên tour" className="sm:col-span-4"><input className="input" {...b("title")} onBlur={() => !f.slug && setF((s) => ({ ...s, slug: slugify(s.title ?? "") }))} /></Field>
        <Field label="Slug (URL)" className="sm:col-span-2"><input className="input" {...b("slug")} /></Field>
        <Field label="Điểm đến" className="sm:col-span-2"><input className="input" {...b("location")} /></Field>
        <Field label="Khởi hành từ" className="sm:col-span-2"><input className="input" {...b("departFrom")} /></Field>
        <Field label="Số ngày"><input className="input" type="number" {...b("durationDays")} /></Field>
        <Field label="Số đêm"><input className="input" type="number" {...b("durationNights")} /></Field>
        <Field label="Giá người lớn" className="sm:col-span-2"><input className="input" type="number" step={10000} {...b("basePrice")} /></Field>
        <Field label="Giá trẻ em" className="sm:col-span-2"><input className="input" type="number" step={10000} {...b("childPrice")} /></Field>
        <Field label="Ảnh (URL)" className="sm:col-span-2"><input className="input" {...b("imageUrl")} /></Field>
        <Field label="Mô tả ngắn" className="sm:col-span-6"><textarea className="input" rows={2} {...b("summary")} /></Field>
        <Field label="Điểm nổi bật (mỗi dòng 1 ý)" className="sm:col-span-3"><textarea className="input" rows={5} value={hl} onChange={(e) => setHl(e.target.value)} /></Field>
        <Field label="Mô tả chi tiết / giá bao gồm" className="sm:col-span-3"><textarea className="input" rows={5} {...b("description")} /></Field>
        <div className="sm:col-span-6">
          <span className="label">Lịch trình</span>
          <div className="space-y-2">
            {itin.map((d, i) => (
              <div key={i} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-6">
                <input className="input" value={d.day} onChange={(e) => setItin(i, "day", e.target.value)} placeholder="Ngày 1" />
                <input className="input sm:col-span-2" value={d.title} onChange={(e) => setItin(i, "title", e.target.value)} placeholder="Tiêu đề" />
                <input className="input sm:col-span-2" value={d.detail} onChange={(e) => setItin(i, "detail", e.target.value)} placeholder="Chi tiết" />
                <button className="text-slate-400 hover:text-rose-600" onClick={() => setF((s) => ({ ...s, itinerary: itin.filter((_, j) => j !== i) }))}><Trash2 size={15} /></button>
              </div>
            ))}
            <Button size="sm" variant="secondary" onClick={() => setF((s) => ({ ...s, itinerary: [...itin, { day: `Ngày ${itin.length + 1}`, title: "", detail: "" }] }))}><Plus size={14} /> Thêm ngày</Button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-6"><input type="checkbox" checked={!!f.isPublished} onChange={(e) => setF((s) => ({ ...s, isPublished: e.target.checked }))} /> Hiển thị trên website</label>
      </div>
    </Modal>
  );
}

function Departures({ tourId, onClose }: { tourId: string; onClose: () => void }) {
  const { data } = useTourQuery(tourId);
  const [save, { isLoading }] = useSaveDepartureMutation();
  const [del] = useDeleteDepartureMutation();
  const [f, setF] = useState({ departDate: "", seatsTotal: 20, price: "" });
  const toast = useToast();
  const can = usePerm();
  async function add() {
    try {
      await save({ tourId, departDate: f.departDate, seatsTotal: Number(f.seatsTotal), price: f.price ? Number(f.price) : null, status: "open" }).unwrap();
      toast("Đã thêm lịch");
      setF({ departDate: "", seatsTotal: 20, price: "" });
    } catch (e) { toast(errorMessage(e), "err"); }
  }
  return (
    <Modal open onClose={onClose} wide title={`Lịch khởi hành – ${data?.title ?? ""}`}>
      {can("tour.manage") && (
        <div className="mb-4 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">
          <Field label="Ngày khởi hành"><input className="input" type="date" value={f.departDate} onChange={(e) => setF({ ...f, departDate: e.target.value })} /></Field>
          <Field label="Tổng số chỗ"><input className="input" type="number" value={f.seatsTotal} onChange={(e) => setF({ ...f, seatsTotal: +e.target.value })} /></Field>
          <Field label="Giá riêng (trống = giá tour)"><input className="input" type="number" step={10000} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
          <div className="flex items-end"><Button className="w-full" loading={isLoading} onClick={add}>Thêm lịch</Button></div>
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-slate-500"><tr><th className="py-2">Ngày</th><th>Đã xác nhận / Tổng</th><th>Giá</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody className="divide-y">
          {data?.departures.map((d) => (
            <tr key={d.id}>
              <td className="py-2 font-medium">{dateVN(d.departDate)}</td>
              <td>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded bg-slate-200"><div className="h-full bg-brand" style={{ width: `${(d.seatsBooked / d.seatsTotal) * 100}%` }} /></div>
                  {d.seatsBooked}/{d.seatsTotal}
                </div>
              </td>
              <td>{vnd(d.price ?? data.basePrice)}</td>
              <td>
                {can("tour.manage") ? (
                  <button onClick={() => save({ id: d.id, departDate: d.departDate, seatsTotal: d.seatsTotal, price: d.price, status: d.status === "open" ? "closed" : "open" })}>
                    <Badge color={d.status === "open" ? "green" : "slate"}>{d.status === "open" ? "Mở bán" : "Đóng"}</Badge>
                  </button>
                ) : <Badge color={d.status === "open" ? "green" : "slate"}>{d.status === "open" ? "Mở bán" : "Đóng"}</Badge>}
              </td>
              <td className="text-right">
                {can("tour.manage") && <button className="p-1 text-slate-400 hover:text-rose-600" onClick={async () => { try { await del(d.id).unwrap(); } catch (e) { toast(errorMessage(e), "err"); } }}><Trash2 size={15} /></button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
