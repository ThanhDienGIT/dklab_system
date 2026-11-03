import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTenantCached } from "@/lib/tenant";

export default function SiteLayout({ children, params }: LayoutProps<"/s/[tenant]">) {
  return (
    <Suspense fallback={<div className="h-16 border-b bg-white" />}>
      <Chrome params={params}>{children}</Chrome>
    </Suspense>
  );
}

async function Chrome({ params, children }: { params: Promise<{ tenant: string }>; children: React.ReactNode }) {
  const { tenant: key } = await params;
  const t = await getTenantCached(key);
  if (!t || t.status !== "active") notFound();
  const c = t.settings.contact ?? {};
  const brand = t.settings.brand?.primaryColor ?? "#0369a1";
  return (
    <div style={{ "--brand": brand } as React.CSSProperties} className="flex min-h-dvh flex-col bg-white">
      <div className="scroll-progress fixed inset-x-0 top-0 z-50 h-0.5 bg-gradient-to-r from-sky-500 via-orange-500 to-emerald-500" aria-hidden />
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-brand text-white shadow-md shadow-sky-500/30">{t.name[0]}</span>
            <span className="text-lg">{t.name}</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
            <Link href="/#tours" className="transition hover:text-brand">Tour</Link>
            <Link href="/#tu-van" className="transition hover:text-brand">Tư vấn</Link>
            <Link href="/#lien-he" className="transition hover:text-brand">Liên hệ</Link>
          </nav>
          {(c.hotline || c.phone) && (
            <a data-guide="hotline" href={`tel:${(c.hotline || c.phone)!.replace(/\s/g, "")}`} className="pulse-ring ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-full bg-orange-600 px-4 text-sm font-semibold text-slate-950 transition hover:bg-orange-500 sm:ml-0">
              <Phone size={15} /> {c.hotline || c.phone}
            </a>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer id="lien-he" className="border-t bg-slate-900 text-slate-300">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3">
          <div>
            <div className="text-lg font-semibold text-white">{t.settings.company?.legalName || t.name}</div>
            {t.settings.company?.taxCode && <p className="mt-1 text-sm">MST: {t.settings.company.taxCode}</p>}
            <p className="mt-2 text-sm text-slate-400">{t.settings.brand?.tagline}</p>
          </div>
          <ul className="space-y-2 text-sm">
            {c.address && <li className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0" /> {c.address}</li>}
            {c.phone && <li className="flex gap-2"><Phone size={16} /> <a href={`tel:${c.phone}`}>{c.phone}</a></li>}
            {c.email && <li className="flex gap-2"><Mail size={16} /> <a href={`mailto:${c.email}`}>{c.email}</a></li>}
          </ul>
          <div className="text-sm text-slate-400">
            Đặt tour online: để lại số điện thoại, nhân viên sẽ gọi xác nhận trong giờ làm việc.
            <div className="mt-3"><Link href="/admin" className="text-slate-500 hover:text-white">Đăng nhập nhân viên</Link></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
