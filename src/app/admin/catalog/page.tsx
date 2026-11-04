"use client";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { usePerm } from "@/components/admin/AdminShell";
import { Badge, Button, cx, Empty, Field, Modal, PageHeader, Skeleton, useToast } from "@/components/ui";
import { vnd } from "@/lib/format";
import { errorMessage, useCatalogQuery, useDeleteCategoryMutation, useDeleteItemMutation, useMeQuery, useSaveCategoryMutation, useSaveItemMutation } from "@/store/api";
import type { CatalogItem, Category } from "@/store/types";

export default function CatalogPage() {
  const { data: me } = useMeQuery();
  const { data, isLoading } = useCatalogQuery();
  const [cat, setCat] = useState<string>("all");
  const [editItem, setEditItem] = useState<Partial<CatalogItem> | null>(null);
  const [editCat, setEditCat] = useState<Partial<Category> | null>(null);
  const [delItem] = useDeleteItemMutation();
  const [delCat] = useDeleteCategoryMutation();
  const toast = useToast();
  const can = usePerm();
  const L = me?.labels;
  if (isLoading || !data || !me) return <Skeleton rows={6} />;
  const items = data.items.filter((i) => cat === "all" || i.categoryId === cat);

  return (
    <>
      <PageHeader title={L!.catalogNav} desc="Thay đổi ở đây hiển thị ngay trên website"
        actions={can("catalog.manage") && <>
          <Button variant="secondary" onClick={() => setEditCat({ sortOrder: data.categories.length, isActive: true })}><Plus size={16} /> Nhóm</Button>
          <Button onClick={() => setEditItem({ categoryId: cat === "all" ? data.categories[0]?.id : cat, isActive: true, tags: [], price: 0, durationMin: me.industry.engine === "slots" ? 60 : null, capacity: me.industry.engine === "rooms" ? 2 : null })}><Plus size={16} /> {L!.item}</Button>
        </>} />
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <aside className="card h-max p-2">
          {[{ id: "all", name: "Tất cả" } as Category, ...data.categories].map((c) => (
            <div key={c.id} className={cx("group flex items-center justify-between rounded-lg px-3 py-2 text-sm", cat === c.id ? "bg-brand/10 font-semibold text-brand" : "hover:bg-slate-50")}>
              <button className="flex-1 text-left" onClick={() => setCat(c.id)}>
                {c.name} <span className="text-xs text-slate-400">{c.id === "all" ? data.items.length : data.items.filter((i) => i.categoryId === c.id).length}</span>
              </button>
              {c.id !== "all" && can("catalog.manage") && (
                <span className="hidden gap-1 group-hover:flex">
                  <button aria-label={`Sửa nhóm ${c.name}`} onClick={() => setEditCat(c)} className="text-slate-400 hover:text-slate-700"><Pencil size={13} /></button>
                  <button aria-label={`Xóa nhóm ${c.name}`} onClick={async () => { if (confirm(`Xóa nhóm "${c.name}"? Các mục bên trong sẽ thành "Chưa phân nhóm".`)) { await delCat(c.id); setCat("all"); } }} className="text-slate-400 hover:text-rose-600"><Trash2 size={13} /></button>
                </span>
              )}
            </div>
          ))}
        </aside>
        <section>
          {!items.length ? <Empty>Chưa có {L!.item.toLowerCase()} nào.</Empty> : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((it) => (
                <div key={it.id} className={cx("card flex flex-col p-4", !it.isActive && "opacity-60")}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{it.name}</h3>
                    {!it.isActive && <Badge>Ẩn</Badge>}
                    {it.tags.map((t) => <Badge key={t} color="amber">{t}</Badge>)}
                  </div>
                  {it.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{it.description}</p>}
                  <div className="mt-auto flex items-end justify-between pt-3">
                    <div>
                      <div className="font-bold">{vnd(it.price)}{me.industry.engine === "rooms" && <span className="text-xs font-normal text-slate-500">/đêm</span>}</div>
                      <div className="text-xs text-slate-500">{it.durationMin ? `${it.durationMin} phút` : ""}{it.capacity ? `Tối đa ${it.capacity} khách` : ""}</div>
                    </div>
                    {can("catalog.manage") && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditItem(it)}>Sửa</Button>
                        <button aria-label={`Xóa ${it.name}`} className="p-1.5 text-slate-400 hover:text-rose-600" onClick={async () => { if (confirm(`Xóa "${it.name}"?`)) { try { await delItem(it.id).unwrap(); toast("Đã xóa"); } catch (e) { toast(errorMessage(e), "err"); } } }}><Trash2 size={15} /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      {editItem && <ItemForm value={editItem} categories={data.categories} engine={me.industry.engine} itemLabel={L!.item} onClose={() => setEditItem(null)} />}
      {editCat && <CategoryForm value={editCat} onClose={() => setEditCat(null)} />}
    </>
  );
}

function CategoryForm({ value, onClose }: { value: Partial<Category>; onClose: () => void }) {
  const [f, setF] = useState(value);
  const [save, { isLoading }] = useSaveCategoryMutation();
  const toast = useToast();
  return (
    <Modal open onClose={onClose} title={value.id ? "Sửa nhóm" : "Thêm nhóm"} footer={<Button loading={isLoading} onClick={async () => { try { await save({ ...f, sortOrder: Number(f.sortOrder ?? 0) }).unwrap(); toast("Đã lưu"); onClose(); } catch (e) { toast(errorMessage(e), "err"); } }}>Lưu</Button>}>
      <div className="space-y-3">
        <Field required label="Tên nhóm"><input className="input" value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Thứ tự hiển thị"><input className="input" type="number" value={f.sortOrder ?? 0} onChange={(e) => setF({ ...f, sortOrder: +e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isActive ?? true} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> Hiển thị trên website</label>
      </div>
    </Modal>
  );
}

function ItemForm({ value, categories, engine, itemLabel, onClose }: { value: Partial<CatalogItem>; categories: Category[]; engine: string; itemLabel: string; onClose: () => void }) {
  const [f, setF] = useState(value);
  const [tags, setTags] = useState((value.tags ?? []).join(", "));
  const [save, { isLoading }] = useSaveItemMutation();
  const toast = useToast();
  const b = (k: keyof CatalogItem) => ({ value: (f[k] as string | number | null) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value }) });
  async function submit() {
    try {
      await save({
        ...f, categoryId: f.categoryId || null, price: Number(f.price ?? 0), sortOrder: Number(f.sortOrder ?? 0),
        durationMin: engine === "slots" ? Number(f.durationMin || 60) : f.durationMin ? Number(f.durationMin) : null,
        capacity: engine === "rooms" ? Number(f.capacity || 2) : f.capacity ? Number(f.capacity) : null,
        imageUrl: f.imageUrl || null, tags: tags.split(",").map((x) => x.trim()).filter(Boolean),
      }).unwrap();
      toast("Đã lưu");
      onClose();
    } catch (e) { toast(errorMessage(e), "err"); }
  }
  return (
    <Modal open onClose={onClose} title={value.id ? `Sửa ${itemLabel.toLowerCase()}` : `Thêm ${itemLabel.toLowerCase()}`} footer={<Button loading={isLoading} onClick={submit}>Lưu</Button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field required label="Tên" className="sm:col-span-2"><input className="input" {...b("name")} /></Field>
        <Field label="Nhóm"><select className="input" {...b("categoryId")}><option value="">Chưa phân nhóm</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field required label={engine === "rooms" ? "Giá / đêm" : "Giá"}><input className="input" type="number" step={1000} min={0} {...b("price")} /></Field>
        {engine === "slots" && <Field required label="Thời lượng (phút)" hint="Dùng để tính khung giờ trống"><input className="input" type="number" step={5} min={5} {...b("durationMin")} /></Field>}
        {engine === "rooms" && <Field required label="Số khách tối đa"><input className="input" type="number" min={1} {...b("capacity")} /></Field>}
        <Field label="Nhãn (phân cách dấu phẩy)" hint="VD: Bán chạy, Mới"><input className="input" value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
        <Field label="Mô tả" className="sm:col-span-2"><textarea className="input" rows={3} {...b("description")} /></Field>
        <Field label="Ảnh (URL https)" className="sm:col-span-2"><input className="input" {...b("imageUrl")} /></Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.isActive ?? true} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> Hiển thị trên website / nhận đặt</label>
      </div>
    </Modal>
  );
}
