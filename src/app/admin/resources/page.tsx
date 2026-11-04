"use client";
import { BedDouble, Brush, LogIn, LogOut, Move, Pencil, Phone, Plus, Save, Sparkles, Trash2, UserPlus, Users, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { usePerm } from "@/components/admin/AdminShell";
import { FloorMap, Legend, type MapTable, type TableState } from "@/components/FloorMap";
import { Guide, type GuideStep } from "@/components/Guide";
import { Badge, Button, cx, Empty, Field, Modal, PageHeader, Skeleton, useToast } from "@/components/ui";
import { dayMonthVN, telHref, timeVN } from "@/lib/format";
import { errorMessage, useCatalogQuery, useDeleteResourceMutation, useMeQuery, useResourcesQuery, useSaveLayoutMutation, useSaveResourceMutation, useUpdateReservationMutation, useWalkinMutation } from "@/store/api";
import type { Resource, ResvView } from "@/store/types";

const hhmm = (d: string) => timeVN(d);
const dm = (d: string) => dayMonthVN(d);

function stateOf(r: Resource): TableState {
  if (r.current?.status === "checked_in") return "occupied";
  if (r.current) return r.current.status === "pending" ? "pending" : "reserved";
  if (r.next && new Date(r.next.startAt).getTime() - Date.now() < 2 * 3600_000) return r.next.status === "pending" ? "pending" : "reserved";
  return "free";
}

const GUIDE: GuideStep[] = [
  { target: "res-map", title: "Trạng thái trực tiếp", body: "Màu thể hiện trạng thái hiện tại: trống, đã đặt (2 giờ tới), chờ xác nhận, đang phục vụ. Tự làm mới mỗi 30 giây." },
  { target: "res-actions", title: "Bấm vào bàn / phòng để thao tác", body: "Xếp khách vãng lai, báo khách đã đến, trả bàn / trả phòng, xem SĐT khách để gọi." },
  { target: "res-edit", title: "Sắp xếp sơ đồ", body: "Bật chế độ sắp xếp để kéo thả vị trí, thêm hoặc sửa bàn / phòng. Bấm Lưu khi xong." },
];

export default function ResourcesPage() {
  const { data: me } = useMeQuery();
  const { data, isLoading } = useResourcesQuery(undefined, { pollingInterval: 30_000 });
  const [selected, setSelected] = useState<Resource | null>(null);
  const [edit, setEdit] = useState<Partial<Resource> | null>(null);
  const can = usePerm();
  if (isLoading || !data || !me) return <Skeleton rows={6} />;
  const engine = me.industry.engine;
  const L = me.labels;

  return (
    <>
      <PageHeader title={L.resourceNav} desc="Trạng thái theo thời gian thực, thao tác nhanh cho lễ tân" />
      {engine === "tables" && <TablesView list={data.filter((r) => r.kind === "table")} onSelect={setSelected} onEdit={setEdit} canManage={can("resource.manage")} />}
      {engine === "rooms" && <RoomsView list={data.filter((r) => r.kind === "room")} onSelect={setSelected} onEdit={setEdit} canManage={can("resource.manage")} />}
      {(engine === "slots" || engine === "tours") && <SlotsView list={data} staffLabel={L.staff ?? "Nhân viên"} bedLabel={L.resource} onEdit={setEdit} canManage={can("resource.manage")} needsBed={!!me.industry.booking.needsBed} />}
      {selected && <ActionPanel r={data.find((x) => x.id === selected.id) ?? selected} engine={engine} onClose={() => setSelected(null)} />}
      {edit && <ResourceForm value={edit} engine={engine} onClose={() => setEdit(null)} />}
      {engine !== "slots" && engine !== "tours" && <Guide steps={GUIDE} storageKey={`admin-res-${engine}`} />}
    </>
  );
}

/* ─────────── Sơ đồ bàn ─────────── */
function TablesView({ list, onSelect, onEdit, canManage }: { list: Resource[]; onSelect: (r: Resource) => void; onEdit: (r: Partial<Resource>) => void; canManage: boolean }) {
  const areas = useMemo(() => [...new Set(list.map((r) => r.area || "Khu chính"))], [list]);
  const [area, setArea] = useState(areas[0] ?? "Khu chính");
  const [editing, setEditing] = useState(false);
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const [saveLayout, { isLoading }] = useSaveLayoutMutation();
  const toast = useToast();
  const inArea = list.filter((r) => (r.area || "Khu chính") === area);
  const tables: MapTable[] = inArea.map((r) => ({
    id: r.id, name: r.name, capacity: r.capacity, shape: r.shape, ...(pos[r.id] ?? { x: r.x, y: r.y }), state: stateOf(r),
    sub: r.current ? `${r.current.name ?? ""} · ${hhmm(r.current.endAt)}` : r.next ? `${hhmm(r.next.startAt)} ${r.next.name ?? ""}` : undefined,
  }));
  const counts = list.reduce((m, r) => ({ ...m, [stateOf(r)]: (m[stateOf(r)] ?? 0) + 1 }), {} as Record<string, number>);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-slate-200/60 p-1">
          {areas.map((a) => <button key={a} onClick={() => setArea(a)} className={cx("rounded-md px-3 py-1.5 text-sm", a === area ? "bg-white font-semibold shadow-sm" : "text-slate-600")}>{a}</button>)}
        </div>
        <span className="text-sm text-slate-500">Trống {counts.free ?? 0} · Đang phục vụ {counts.occupied ?? 0} · Đã đặt {(counts.reserved ?? 0) + (counts.pending ?? 0)}</span>
        {canManage && (
          <div data-guide="res-edit" className="ml-auto flex gap-2">
            {editing ? (
              <>
                <Button size="sm" variant="secondary" onClick={() => onEdit({ kind: "table", area, capacity: 4, shape: "square", x: 0, y: 0, isActive: true })}><Plus size={14} /> Thêm bàn</Button>
                <Button size="sm" loading={isLoading} onClick={async () => {
                  try { await saveLayout({ items: Object.entries(pos).map(([id, p]) => ({ id, ...p })) }).unwrap(); setPos({}); setEditing(false); toast("Đã lưu sơ đồ"); } catch (e) { toast(errorMessage(e), "err"); }
                }}><Save size={14} /> Lưu sơ đồ</Button>
              </>
            ) : <Button size="sm" variant="secondary" onClick={() => setEditing(true)}><Move size={14} /> Sắp xếp sơ đồ</Button>}
          </div>
        )}
      </div>
      <div data-guide="res-map">
        {inArea.length ? (
          <FloorMap tables={tables} editable={editing} onMove={(id, x, y) => setPos((p) => ({ ...p, [id]: { x, y } }))}
            onPick={(id) => onSelect(list.find((r) => r.id === id)!)} />
        ) : <Empty>Khu vực này chưa có bàn.</Empty>}
      </div>
      <div data-guide="res-actions" className="flex flex-wrap items-center justify-between gap-2">
        <Legend />
        {editing && <p className="text-xs text-slate-500">Kéo thả để đổi vị trí · bấm “Thêm bàn” để tạo mới · sửa thông tin bàn trong danh sách dưới</p>}
      </div>
      {editing && (
        <div className="card divide-y">
          {inArea.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span><b>{r.name}</b> · {r.capacity} chỗ · {r.shape === "round" ? "tròn" : r.shape === "rect" ? "dài" : "vuông"}</span>
              <Button size="sm" variant="ghost" onClick={() => onEdit(r)}><Pencil size={13} /> Sửa</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────── Sơ đồ phòng ─────────── */
function RoomsView({ list, onSelect, onEdit, canManage }: { list: Resource[]; onSelect: (r: Resource) => void; onEdit: (r: Partial<Resource>) => void; canManage: boolean }) {
  const { data: cat } = useCatalogQuery();
  const floors = [...new Set(list.map((r) => r.area || "Khác"))];
  const typeName = (id: string | null) => cat?.items.find((i) => i.id === id)?.name ?? "—";
  const COLOR: Record<TableState, string> = { free: "border-emerald-300 bg-emerald-50", occupied: "border-sky-500 bg-sky-600 text-white", reserved: "border-amber-400 bg-amber-50", pending: "border-rose-400 bg-rose-50", busy: "", small: "", selected: "" };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Legend states={[{ state: "free", label: "Trống" }, { state: "reserved", label: "Sắp nhận" }, { state: "pending", label: "Chờ xác nhận" }, { state: "occupied", label: "Có khách" }]} />
        {canManage && <Button data-guide="res-edit" size="sm" variant="secondary" onClick={() => onEdit({ kind: "room", capacity: 2, area: floors[0], isActive: true })}><Plus size={14} /> Thêm phòng</Button>}
      </div>
      <div data-guide="res-map" className="space-y-5">
        {floors.map((fl) => (
          <section key={fl}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">{fl}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {list.filter((r) => (r.area || "Khác") === fl).map((r) => {
                const st = stateOf(r);
                return (
                  <button key={r.id} data-guide="res-actions" onClick={() => onSelect(r)} className={cx("rounded-2xl border-2 p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md", COLOR[st])}>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold">{r.name}</span>
                      {r.housekeeping !== "clean" && <span title={r.housekeeping === "dirty" ? "Cần dọn" : "Bảo trì"}>{r.housekeeping === "dirty" ? <Brush size={16} /> : <Wrench size={16} />}</span>}
                    </div>
                    <div className={cx("text-xs", st === "occupied" ? "text-sky-100" : "text-slate-500")}>{typeName(r.itemId)}</div>
                    <div className="mt-2 truncate text-xs font-medium">
                      {r.current ? `${r.current.name ?? ""} · trả ${dm(r.current.endAt)}` : r.next ? `Nhận ${dm(r.next.startAt)} · ${r.next.name ?? ""}` : "Trống"}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        {!list.length && <Empty>Chưa có phòng.</Empty>}
      </div>
    </div>
  );
}

/* ─────────── Nhân viên & giường (spa / kế toán) ─────────── */
function SlotsView({ list, staffLabel, bedLabel, onEdit, canManage, needsBed }: { list: Resource[]; staffLabel: string; bedLabel: string; onEdit: (r: Partial<Resource>) => void; canManage: boolean; needsBed: boolean }) {
  const [del] = useDeleteResourceMutation();
  const groups = [{ kind: "staff" as const, label: staffLabel, icon: Users }, ...(needsBed ? [{ kind: "bed" as const, label: bedLabel, icon: BedDouble }] : [])];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {groups.map((g) => (
        <section key={g.kind} className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><g.icon size={17} /> {g.label}</h2>
            {canManage && <Button size="sm" variant="secondary" onClick={() => onEdit({ kind: g.kind, capacity: 1, isActive: true })}><Plus size={14} /> Thêm</Button>}
          </div>
          <ul className="divide-y">
            {list.filter((r) => r.kind === g.kind).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <div className="font-medium">{r.name} {!r.isActive && <Badge>Tạm nghỉ</Badge>}</div>
                  <div className="text-xs text-slate-500">
                    {r.current ? <span className="text-sky-700">Đang phục vụ {r.current.name} đến {hhmm(r.current.endAt)}</span> : r.next ? `Lịch kế tiếp ${hhmm(r.next.startAt)} · ${r.next.name ?? ""}` : "Rảnh hôm nay"}
                  </div>
                </div>
                {canManage && (
                  <span className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onEdit(r)}>Sửa</Button>
                    <button aria-label={`Xóa ${r.name}`} className="p-1.5 text-slate-400 hover:text-rose-600" onClick={() => confirm(`Xóa ${r.name}?`) && del(r.id)}><Trash2 size={15} /></button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ─────────── Bảng thao tác khi bấm bàn / phòng ─────────── */
function ActionPanel({ r, engine, onClose }: { r: Resource; engine: string; onClose: () => void }) {
  const [walkin, w] = useWalkinMutation();
  const [upd, u] = useUpdateReservationMutation();
  const [saveRes] = useSaveResourceMutation();
  const [form, setForm] = useState({ label: "", partySize: Math.min(2, r.capacity), duration: engine === "rooms" ? 1 : 90 });
  const toast = useToast();
  const can = usePerm();
  const act = async (p: Promise<unknown>, msg: string) => { try { await p; toast(msg); onClose(); } catch (e) { toast(errorMessage(e), "err"); } };
  const renderBlock = (v: ResvView, title: string) => (
    <div className="rounded-xl border p-3 text-sm">
      <div className="text-xs font-semibold uppercase text-slate-500">{title}</div>
      <div className="mt-1 font-semibold">{v.name ?? "Khách"} {v.code && <span className="font-normal text-slate-400">· {v.code}</span>}</div>
      <div className="text-slate-600">{engine === "rooms" ? `${dm(v.startAt)} → ${dm(v.endAt)}` : `${hhmm(v.startAt)} – ${hhmm(v.endAt)}`} · {v.partySize} khách · <Badge color={v.status === "checked_in" ? "blue" : v.status === "pending" ? "red" : "amber"}>{v.status === "checked_in" ? "Đang phục vụ" : v.status === "pending" ? "Chờ xác nhận" : "Đã xác nhận"}</Badge></div>
      {v.phone && <a href={telHref(v.phone)} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"><Phone size={13} /> {v.phone}</a>}
      {can("booking.handle") && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {v.status !== "checked_in" && <Button size="sm" variant="success" loading={u.isLoading} onClick={() => act(upd({ id: v.id, status: "checked_in" }).unwrap(), "Đã nhận khách")}><LogIn size={14} /> {engine === "rooms" ? "Check-in" : "Khách đã đến"}</Button>}
          {v.status === "checked_in" && <Button size="sm" loading={u.isLoading} onClick={() => act(Promise.all([upd({ id: v.id, status: "completed" }).unwrap(), engine === "rooms" ? saveRes({ id: r.id, housekeeping: "dirty" }).unwrap() : null]), engine === "rooms" ? "Đã check-out, phòng cần dọn" : "Đã trả bàn")}><LogOut size={14} /> {engine === "rooms" ? "Check-out" : "Trả bàn"}</Button>}
          {v.status !== "checked_in" && <Button size="sm" variant="ghost" onClick={() => confirm("Đánh dấu khách không đến? Chỗ sẽ được nhả.") && act(upd({ id: v.id, status: "no_show" }).unwrap(), "Đã nhả chỗ")}>Không đến</Button>}
        </div>
      )}
    </div>
  );
  return (
    <Modal open onClose={onClose} title={`${engine === "rooms" ? "Phòng" : "Bàn"} ${r.name}${r.area ? ` · ${r.area}` : ""}`}>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">{r.capacity} chỗ{engine === "rooms" && ` · ${r.housekeeping === "clean" ? "Đã dọn" : r.housekeeping === "dirty" ? "Cần dọn" : "Bảo trì"}`}</p>
        {r.current && renderBlock(r.current, "Hiện tại")}
        {r.next && renderBlock(r.next, "Lượt kế tiếp")}
        {engine === "rooms" && can("resource.manage") && r.housekeeping !== "clean" && (
          <Button size="sm" variant="secondary" onClick={() => act(saveRes({ id: r.id, housekeeping: "clean" }).unwrap(), "Đã đánh dấu phòng sạch")}><Sparkles size={14} /> Đã dọn xong</Button>
        )}
        {!r.current && can("booking.handle") && (
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-1 text-sm font-semibold"><UserPlus size={15} /> {engine === "rooms" ? "Nhận khách tại quầy" : "Xếp khách vãng lai"}</div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Tên khách" className="col-span-3"><input className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Không bắt buộc" /></Field>
              <Field label="Số khách"><input className="input" type="number" min={1} value={form.partySize} onChange={(e) => setForm({ ...form, partySize: +e.target.value })} /></Field>
              <Field label={engine === "rooms" ? "Số đêm" : "Phút"} className="col-span-2"><input className="input" type="number" min={1} value={form.duration} onChange={(e) => setForm({ ...form, duration: +e.target.value })} /></Field>
            </div>
            <Button className="mt-2 w-full" loading={w.isLoading} onClick={() => act(walkin({ resourceId: r.id, label: form.label || undefined, partySize: form.partySize, durationMin: engine === "rooms" ? form.duration * 24 * 60 : form.duration, status: "checked_in" }).unwrap(), "Đã xếp khách")}>
              {engine === "rooms" ? "Check-in ngay" : "Xếp khách vào bàn"}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ─────────── Thêm / sửa tài nguyên ─────────── */
function ResourceForm({ value, engine, onClose }: { value: Partial<Resource>; engine: string; onClose: () => void }) {
  const [f, setF] = useState(value);
  const [save, { isLoading }] = useSaveResourceMutation();
  const [del] = useDeleteResourceMutation();
  const { data: cat } = useCatalogQuery(undefined, { skip: engine !== "rooms" });
  const toast = useToast();
  const kindLabel = f.kind === "table" ? "bàn" : f.kind === "room" ? "phòng" : f.kind === "bed" ? "giường / phòng" : "nhân viên";
  return (
    <Modal open onClose={onClose} title={value.id ? `Sửa ${kindLabel}` : `Thêm ${kindLabel}`}
      footer={<>
        {value.id && <Button variant="ghost" className="mr-auto text-rose-600" onClick={async () => { if (confirm("Xóa?")) { await del(value.id!); onClose(); } }}>Xóa</Button>}
        <Button loading={isLoading} onClick={async () => {
          try {
            await save({ ...f, capacity: Number(f.capacity ?? 1), itemId: f.itemId || null, x: Number(f.x ?? 0), y: Number(f.y ?? 0) }).unwrap();
            toast("Đã lưu");
            onClose();
          } catch (e) { toast(errorMessage(e), "err"); }
        }}>Lưu</Button>
      </>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field required label={f.kind === "staff" ? "Họ tên" : "Tên / số"}><input className="input" value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        {f.kind !== "staff" && <Field label={f.kind === "room" ? "Tầng / khu" : "Khu vực"}><input className="input" value={f.area ?? ""} onChange={(e) => setF({ ...f, area: e.target.value })} /></Field>}
        {(f.kind === "table" || f.kind === "bed") && <Field required label="Sức chứa (khách)"><input className="input" type="number" min={1} value={f.capacity ?? 1} onChange={(e) => setF({ ...f, capacity: +e.target.value })} /></Field>}
        {f.kind === "table" && (
          <Field label="Hình dạng"><select className="input" value={f.shape ?? "square"} onChange={(e) => setF({ ...f, shape: e.target.value as Resource["shape"] })}><option value="square">Vuông</option><option value="round">Tròn</option><option value="rect">Dài</option></select></Field>
        )}
        {f.kind === "room" && (
          <Field required label="Loại phòng"><select className="input" value={f.itemId ?? ""} onChange={(e) => setF({ ...f, itemId: e.target.value })}><option value="">— Chọn —</option>{cat?.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>
        )}
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.isActive ?? true} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> Đang hoạt động (nhận đặt)</label>
      </div>
    </Modal>
  );
}
