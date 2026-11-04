"use client";
import { History, KeyRound, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Provider } from "react-redux";
import { cx, ToastProvider } from "@/components/ui";
import { makePlatformStore, usePMe } from "@/store/platform";

const NAV = [
  { href: "/superdklab", label: "Tổng quan & doanh nghiệp", icon: LayoutDashboard },
  { href: "/superdklab/audit", label: "Nhật ký nền tảng", icon: History },
  { href: "/superdklab/account", label: "Tài khoản & mật khẩu", icon: KeyRound },
];

function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { data: me } = usePMe(undefined, { skip: path === "/superdklab/login" });
  if (path === "/superdklab/login") return <>{children}</>;
  return (
    <div className="min-h-dvh bg-slate-100 lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-950 text-slate-300 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-rose-600 text-white"><ShieldCheck size={18} /></span>
          <div><div className="text-sm font-bold text-white">DKLab Platform</div><div className="text-[11px] text-slate-400">Super Admin</div></div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((n) => {
            const active = n.href === "/superdklab" ? path === n.href || path.startsWith("/superdklab/tenants") : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={cx("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition", active ? "bg-white/10 font-semibold text-white" : "hover:bg-white/5 hover:text-white")}>
                <n.icon size={17} /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
            <div><div className="text-sm font-medium text-white">{me?.name}</div><div className="text-[11px] text-slate-400">@{me?.username}</div></div>
            <button title="Đăng xuất" aria-label="Đăng xuất" className="rounded p-1.5 hover:bg-white/10" onClick={async () => { await fetch("/api/platform/auth/logout", { method: "POST" }); window.location.href = "/superdklab/login"; }}><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 bg-slate-950 px-4 text-white lg:hidden">
        <ShieldCheck size={18} className="text-orange-400" /> <span className="font-semibold">Super Admin</span>
        <nav className="ml-auto flex gap-3 text-xs">{NAV.map((n) => <Link key={n.href} href={n.href} aria-label={n.label}><n.icon size={18} /></Link>)}</nav>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
    </div>
  );
}

const noop = () => () => {};
export function PlatformApp({ children }: { children: ReactNode }) {
  // Chỉ render ở trình duyệt: dữ liệu quản trị nền tảng không prerender / không cache
  const isClient = useSyncExternalStore(noop, () => true, () => false);
  if (!isClient) return <div className="min-h-dvh bg-slate-950" />;
  return <ClientApp>{children}</ClientApp>;
}

function ClientApp({ children }: { children: ReactNode }) {
  const [store] = useState(makePlatformStore);
  return (
    <Provider store={store}>
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </Provider>
  );
}
