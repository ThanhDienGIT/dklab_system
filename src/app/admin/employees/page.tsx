"use client";
import { Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { usePerm } from "@/components/admin/AdminShell";
import { Badge, Button, Empty, Field, Modal, PageHeader, Skeleton, useToast } from "@/components/ui";
import { dateVN, telHref, vnd } from "@/lib/format";
import { errorMessage, useDeleteEmployeeMutation, useEmployeesQuery, useSaveEmployeeMutation } from "@/store/api";
import type { Employee } from "@/store/types";

const STATUS = { working: { l: "Đang làm", c: "green" }, on_leave: { l: "Nghỉ phép", c: "amber" }, quit: { l: "Đã nghỉ", c: "slate" } } as const;

export default function EmployeesPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useEmployeesQuery({ q: search || undefined });
  const [editing, setEditing] = useState<Partial<Employee> | null>(null);
  const [del] = useDeleteEmployeeMutation();
  const toast = useToast();
  const can = usePerm();
  return (
    <>
      <PageHeader title="Nhân viên" desc="Hồ sơ nhân sự, chức vụ, chi nhánh. Tài khoản đăng nhập quản lý ở mục Tài khoản & quyền"
        actions={can("employee.manage") && <Button onClick={() => setEditing({ status: "working", baseSalary: 0 })}><Plus size={16} /> Thêm nhân viên</Button>} />
      <form onSubmit={(e) => { e.preventDefault(); setSearch(q); }} className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder="Tìm tên, mã, SĐT…" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>
      {isLoading ? <Skeleton /> : !data?.items.length ? <Empty>Chưa có nhân viên.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-2.5">Mã</th><th>Họ tên</th><th>Chức vụ</th><th>Chi nhánh</th><th>Liên hệ</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody className="divide-y">
              {data.items.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs">{e.code}</td>
                  <td className="font-medium">{e.fullName}{e.accountEmail && <div className="text-xs font-normal text-slate-500">TK: {e.accountEmail}</div>}</td>
                  <td>{e.position}<div className="text-xs text-slate-500">{e.department}</div></td>
                  <td className="text-slate-600">{e.branchName}</td>
                  <td>{e.phone && <a href={telHref(e.phone)} className="text-brand">{e.phone}</a>}</td>
                  <td><Badge color={STATUS[e.status].c}>{STATUS[e.status].l}</Badge></td>
                  <td className="whitespace-nowrap pr-3 text-right">
                    {can("employee.manage") && <>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(e)}>Sửa</Button>
                      <button className="rounded p-1.5 text-slate-400 hover:text-rose-600" onClick={async () => { if (confirm(`Xóa ${e.fullName}?`)) { try { await del(e.id).unwrap(); toast("Đã xóa"); } catch (er) { toast(errorMessage(er), "err"); } } }}><Trash2 size={15} /></button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <EmployeeForm value={editing} branches={data?.branches ?? []} onClose={() => setEditing(null)} />}
    </>
  );
}

function EmployeeForm({ value, branches, onClose }: { value: Partial<Employee>; branches: { id: string; name: string }[]; onClose: () => void }) {
  const [f, setF] = useState<Partial<Employee>>(value);
  const [save, { isLoading }] = useSaveEmployeeMutation();
  const toast = useToast();
  const b = (k: keyof Employee) => ({ value: (f[k] as string | number) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value })) });
  async function submit() {
    try {
      await save({ ...f, baseSalary: Number(f.baseSalary ?? 0), branchId: f.branchId || null, startDate: f.startDate || null }).unwrap();
      toast("Đã lưu nhân viên");
      onClose();
    } catch (e) { toast(errorMessage(e), "err"); }
  }
  return (
    <Modal open onClose={onClose} title={value.id ? "Sửa nhân viên" : "Thêm nhân viên"} footer={<Button loading={isLoading} onClick={submit}>Lưu</Button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field required label="Mã NV"><input className="input" {...b("code")} /></Field>
        <Field required label="Họ tên"><input className="input" {...b("fullName")} /></Field>
        <Field label="SĐT"><input className="input" {...b("phone")} /></Field>
        <Field label="Email"><input className="input" {...b("email")} /></Field>
        <Field label="Chức vụ"><input className="input" {...b("position")} /></Field>
        <Field label="Phòng ban"><input className="input" {...b("department")} /></Field>
        <Field label="Chi nhánh">
          <select className="input" {...b("branchId")}><option value="">—</option>{branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        </Field>
        <Field label="Ngày vào làm"><input className="input" type="date" {...b("startDate")} /></Field>
        <Field label="Lương cơ bản" hint={f.baseSalary ? vnd(Number(f.baseSalary)) : undefined}><input className="input" type="number" step={100000} {...b("baseSalary")} /></Field>
        <Field label="Trạng thái">
          <select className="input" {...b("status")}><option value="working">Đang làm</option><option value="on_leave">Nghỉ phép</option><option value="quit">Đã nghỉ</option></select>
        </Field>
        <Field label="Ghi chú" className="sm:col-span-2"><textarea className="input" {...b("note")} /></Field>
        {value.startDate && <p className="text-xs text-slate-500 sm:col-span-2">Vào làm từ {dateVN(value.startDate)}</p>}
      </div>
    </Modal>
  );
}
