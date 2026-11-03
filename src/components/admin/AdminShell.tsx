"use client";
import {
  ExternalLink, FileText, History, Home, IdCard, Inbox, LogOut, Map, Menu, Receipt, Settings, Shield, Users, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { cx, ToastProvider } from "@/components/ui";
import { DEFAULT_ROLES } from "@/modules/presets";
import { MODULES, hasPermission } from "@/modules/registry";
import { api, useDashboardQuery, useMeQuery } from "@/store/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { StoreProvider } from "@/store/Provider";
import { closeSidebar, setSession, toggleSidebar } from "@/store/store";

const ICONS: Record<string, LucideIcon> = { home: Home, shield: Shield, settings: Settings, history: History, inbox: Inbox, users: Users, id: IdCard, receipt: Receipt, map: Map, file: FileText };

export function usePerm() {
  const { data } = useMeQuery();
  return (key: string) => hasPermission(data?.user.perms, key);
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.sidebarOpen);
  const session = useAppSelector((s) => s.session);
  const { data: me, isLoading } = useMeQuery();
  // Badge số đặt chỗ mới: dùng chung cache dashboard, tự làm mới mỗi 60 giây
  const canDash = hasPermission(me?.user.perms, "dashboard.view");
  const newCount = useDashboardQuery(undefined, { skip: !canDash, pollingInterval: 60_000 }).data?.bookings.newCount;

  // Đổi tài khoản trên cùng trình duyệt => xóa cache của người trước
  useEffect(() => {
    if (!me) return;
    if (session.userId && session.userId !== me.user.id) dispatch(api.util.resetApiState());
    if (session.userId !== me.user.id) dispatch(setSession({ userId: me.user.id, tenantId: me.tenant.id }));
  }, [me, session.userId, dispatch]);

  useEffect(() => {
    dispatch(closeSidebar());
  }, [pathname, dispatch]);

  useEffect(() => {
    if (me?.tenant.brand.primaryColor) document.documentElement.style.setProperty("--brand", me.tenant.brand.primaryColor);
  }, [me?.tenant.brand.primaryColor]);

  const nav = MODULES.filter((m) => !me || me.modules.includes(m.key))
    .flatMap((m) => m.nav)
    .filter((n) => hasPermission(me?.user.perms, n.permission) || hasPermission(me?.user.perms, n.permission.replace(/\.view$/, ".view:own")));
  // Sắp xếp: Tổng quan, Đặt chỗ, nghiệp vụ, rồi hệ thống
  const order = ["/admin", "/admin/bookings", "/admin/tours", "/admin/invoices", "/admin/customers", "/admin/employees", "/admin/users", "/admin/settings", "/admin/audit"];
  nav.sort((a, b) => order.indexOf(a.href) - order.indexOf(b.href));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    dispatch({ type: "session/logout" });
    window.location.href = "/login";
  }

  return (
    <div className="min-h-dvh lg:pl-60">
      <aside
        className={cx(
          "no-print fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">{me?.tenant.name?.[0] ?? "D"}</span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{me?.tenant.name ?? "…"}</div>
            <div className="text-[11px] text-slate-500">Quản trị</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {nav.map((n) => {
            const Icon = ICONS[n.icon] ?? FileText;
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                prefetch
                className={cx(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                  active ? "bg-brand/10 font-medium text-brand" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <Icon size={17} />
                <span className="flex-1">{n.href === "/admin/bookings" && me ? me.labels.booking : n.label}</span>
                {n.href === "/admin/bookings" && !!newCount && <span className="rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white">{newCount}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <a href="/" target="_blank" className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
            <ExternalLink size={16} /> Xem website
          </a>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{me?.user.name}</div>
              <div className="truncate text-[11px] text-slate-500">{me?.user.roles.map((r) => DEFAULT_ROLES.find((d) => d.key === r)?.name ?? r).join(", ")}</div>
            </div>
            <button onClick={logout} title="Đăng xuất" className="rounded p-1.5 text-slate-500 hover:bg-slate-200">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick={() => dispatch(closeSidebar())} />}

      <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur lg:hidden">
        <button onClick={() => dispatch(toggleSidebar())} className="rounded p-1.5 hover:bg-slate-100" aria-label="Menu">
          <Menu size={20} />
        </button>
        <span className="font-semibold">{me?.tenant.name}</span>
      </header>

      <main className="mx-auto max-w-6xl p-4 sm:p-6">{isLoading && !me ? <div className="h-40 animate-pulse rounded-xl bg-slate-200/60" /> : children}</main>
    </div>
  );
}

export function AdminApp({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </StoreProvider>
  );
}
