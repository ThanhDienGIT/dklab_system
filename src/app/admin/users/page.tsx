"use client";
import { KeyRound, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Field, Modal, PageHeader, Skeleton, useToast } from "@/components/ui";
import { dateTimeVN } from "@/lib/format";
import { MODULES, parsePermission } from "@/modules/registry";
import { errorMessage, useCreateUserMutation, useDeleteRoleMutation, useMeQuery, useSaveRoleMutation, useUpdateUserMutation, useUsersQuery } from "@/store/api";
import type { Role, UserRow } from "@/store/types";

export default function UsersPage() {
  const { data, isLoading } = useUsersQuery();
  const { data: me } = useMeQuery();
  const [userForm, setUserForm] = useState<Partial<UserRow> | null>(null);
  const [roleForm, setRoleForm] = useState<Partial<Role> | null>(null);
  const [update] = useUpdateUserMutation();
  const toast = useToast();
  if (isLoading || !data) return <Skeleton />;
  const roleName = (id: string) => data.roles.find((r) => r.id === id)?.name ?? "?";

  return (
    <>
      <PageHeader title="Tài khoản & phân quyền" desc="Đăng nhập bằng JWT (access 15 phút, refresh xoay vòng 30 ngày). Đổi quyền có hiệu lực trong ≤15 phút; khóa/đổi mật khẩu đăng xuất ngay mọi thiết bị." />
      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Tài khoản đăng nhập</h2>
          <Button size="sm" onClick={() => setUserForm({ roleIds: [] })}><Plus size={14} /> Thêm tài khoản</Button>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-2.5">Họ tên</th><th>Đăng nhập</th><th>Vai trò</th><th>Lần cuối</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody className="divide-y">
              {data.items.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2.5 font-medium">{u.fullName}{u.id === me?.user.id && <span className="ml-1 text-xs text-slate-400">(bạn)</span>}</td>
                  <td className="text-slate-600">{u.email}<div className="text-xs">{u.phone}</div></td>
                  <td><div className="flex flex-wrap gap-1">{u.roleIds.map((r) => <Badge key={r} color="blue">{roleName(r)}</Badge>)}</div></td>
                  <td className="text-xs text-slate-500">{u.lastLoginAt ? dateTimeVN(u.lastLoginAt) : "Chưa đăng nhập"}</td>
                  <td><Badge color={u.status === "active" ? "green" : "red"}>{u.status === "active" ? "Hoạt động" : "Đã khóa"}</Badge></td>
                  <td className="whitespace-nowrap pr-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setUserForm(u)}>Sửa</Button>
                    {u.id !== me?.user.id && (
                      <Button size="sm" variant="ghost" onClick={async () => {
                        try { await update({ id: u.id, status: u.status === "active" ? "disabled" : "active" }).unwrap(); toast("Đã cập nhật"); } catch (e) { toast(errorMessage(e), "err"); }
                      }}>{u.status === "active" ? "Khóa" : "Mở khóa"}</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Vai trò</h2>
          <Button size="sm" variant="secondary" onClick={() => setRoleForm({ permissions: [] })}><Plus size={14} /> Tạo vai trò</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {data.roles.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold"><ShieldCheck size={16} className="text-brand" /> {r.name}</div>
                  <p className="text-xs text-slate-500">{r.description}</p>
                </div>
                {r.key !== "owner" && <Button size="sm" variant="ghost" onClick={() => setRoleForm(r)}>Sửa quyền</Button>}
              </div>
              <p className="mt-2 text-xs text-slate-600">{r.permissions.includes("*") ? "Toàn quyền" : `${r.permissions.length} quyền`}{r.permissions.some((p) => p.endsWith(":own")) && " · có quyền giới hạn 'chỉ của mình'"}</p>
            </div>
          ))}
        </div>
      </section>
      {userForm && <UserForm value={userForm} roles={data.roles} onClose={() => setUserForm(null)} />}
      {roleForm && <RoleForm value={roleForm} onClose={() => setRoleForm(null)} />}
    </>
  );
}

function UserForm({ value, roles, onClose }: { value: Partial<UserRow>; roles: Role[]; onClose: () => void }) {
  const [f, setF] = useState({ fullName: value.fullName ?? "", email: value.email ?? "", phone: value.phone ?? "", password: "", roleIds: value.roleIds ?? [] });
  const [create, c] = useCreateUserMutation();
  const [update, u] = useUpdateUserMutation();
  const toast = useToast();
  async function submit() {
    try {
      if (value.id) await update({ id: value.id, fullName: f.fullName, roleIds: f.roleIds, ...(f.password ? { password: f.password } : {}) }).unwrap();
      else await create(f).unwrap();
      toast("Đã lưu tài khoản");
      onClose();
    } catch (e) { toast(errorMessage(e), "err"); }
  }
  return (
    <Modal open onClose={onClose} title={value.id ? "Sửa tài khoản" : "Thêm tài khoản"} footer={<Button loading={c.isLoading || u.isLoading} onClick={submit}>Lưu</Button>}>
      <div className="space-y-3">
        <Field label="Họ tên"><input className="input" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
        {!value.id && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email"><input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="SĐT"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          </div>
        )}
        <Field label={value.id ? "Đặt lại mật khẩu (bỏ trống = giữ nguyên)" : "Mật khẩu"} hint="Tối thiểu 8 ký tự, có chữ và số">
          <div className="relative"><KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input pl-9" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        </Field>
        <div>
          <span className="label">Vai trò</span>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {roles.map((r) => (
              <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">
                <input type="checkbox" checked={f.roleIds.includes(r.id)} onChange={(e) => setF({ ...f, roleIds: e.target.checked ? [...f.roleIds, r.id] : f.roleIds.filter((x) => x !== r.id) })} />
                {r.name}
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function RoleForm({ value, onClose }: { value: Partial<Role>; onClose: () => void }) {
  const [name, setName] = useState(value.name ?? "");
  const [description, setDescription] = useState(value.description ?? "");
  // Map key -> scope ("tenant" | "own")
  const [perms, setPerms] = useState<Record<string, string>>(() => Object.fromEntries((value.permissions ?? []).map((p) => { const x = parsePermission(p); return [x.key, x.scope]; })));
  const [save, s] = useSaveRoleMutation();
  const [del] = useDeleteRoleMutation();
  const toast = useToast();
  async function submit() {
    try {
      await save({ id: value.id, name, description, permissions: Object.entries(perms).map(([k, sc]) => (sc === "tenant" ? k : `${k}:${sc}`)) }).unwrap();
      toast("Đã lưu vai trò");
      onClose();
    } catch (e) { toast(errorMessage(e), "err"); }
  }
  const scoped = (k: string) => k.startsWith("booking.");
  return (
    <Modal open onClose={onClose} wide title={value.id ? `Quyền của vai trò: ${value.name}` : "Tạo vai trò"}
      footer={<>
        {value.id && !value.isSystem && <Button variant="ghost" className="mr-auto text-rose-600" onClick={async () => { if (confirm("Xóa vai trò?")) { await del(value.id!); onClose(); } }}>Xóa</Button>}
        <Button loading={s.isLoading} onClick={submit}>Lưu</Button>
      </>}>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Field label="Tên vai trò"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Mô tả"><input className="input" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      </div>
      <div className="space-y-3">
        {MODULES.map((m) => (
          <fieldset key={m.key} className="rounded-lg border p-3">
            <legend className="px-1 text-sm font-semibold">{m.name}</legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {m.permissions.map((p) => (
                <div key={p.key} className="flex items-center gap-2 text-sm">
                  <input id={p.key} type="checkbox" checked={!!perms[p.key]} onChange={(e) => setPerms((s) => { const n = { ...s }; if (e.target.checked) n[p.key] = "tenant"; else delete n[p.key]; return n; })} />
                  <label htmlFor={p.key} className="flex-1">{p.label}</label>
                  {scoped(p.key) && perms[p.key] && (
                    <select className="rounded border px-1 py-0.5 text-xs" value={perms[p.key]} onChange={(e) => setPerms((s) => ({ ...s, [p.key]: e.target.value }))}>
                      <option value="tenant">Tất cả</option><option value="own">Chỉ được giao</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </Modal>
  );
}
