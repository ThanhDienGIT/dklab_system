import { CalendarDays, Clock, Headphones, MapPin, ShieldCheck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TourCover } from "@/components/site/TourCover";
import { ContactForm } from "@/components/site/BookingForm";
import { dateVN, vnd } from "@/lib/format";
import { getPublicTours } from "@/lib/public-data";
import { getTenantCached } from "@/lib/tenant";

export async function generateMetadata({ params }: PageProps<"/s/[tenant]">): Promise<Metadata> {
  const t = await getTenantCached((await params).tenant);
  return { title: t ? `${t.name} – ${t.settings.brand?.tagline ?? "Đặt tour du lịch"}` : "Không tìm thấy", description: t?.settings.brand?.tagline };
}

export default async function Home({ params }: PageProps<"/s/[tenant]">) {
  const t = await getTenantCached((await params).tenant);
  if (!t) notFound();
  const tours = await getPublicTours(t.id);
  const hero = t.settings.brand?.heroImage;
  return (
    <>
      <section className="relative overflow-hidden bg-slate-900">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand via-cyan-800 to-slate-900" />
        )}
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-white sm:py-28">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <ShieldCheck size={14} /> Giá minh bạch · Xác nhận qua điện thoại · Xuất hóa đơn VAT
          </p>
          <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">{t.settings.brand?.tagline ?? `Du lịch cùng ${t.name}`}</h1>
          <p className="mt-4 max-w-xl text-white/80">Chọn tour, để lại số điện thoại. Nhân viên tư vấn gọi lại xác nhận chỗ và gửi mã QR thanh toán, không cần tạo tài khoản.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#tours" className="rounded-full bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-100">Xem tour đang mở bán</Link>
            <Link href="#tu-van" className="rounded-full border border-white/40 px-6 py-3 font-semibold hover:bg-white/10">Nhờ tư vấn</Link>
          </div>
        </div>
      </section>

      <section className="border-b bg-slate-50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-6 text-sm sm:grid-cols-4">
          {[
            { i: Headphones, t: "Tư vấn 1-1", d: "Gọi lại trong giờ làm việc" },
            { i: Wallet, t: "Thanh toán VietQR", d: "Quét mã mọi ngân hàng" },
            { i: ShieldCheck, t: "Hóa đơn điện tử", d: "Xuất HĐ VAT theo yêu cầu" },
            { i: CalendarDays, t: "Lịch khởi hành", d: "Cập nhật chỗ trống liên tục" },
          ].map((x) => (
            <div key={x.t} className="flex items-start gap-3">
              <x.i size={20} className="mt-0.5 text-brand" />
              <div><div className="font-semibold">{x.t}</div><div className="text-slate-500">{x.d}</div></div>
            </div>
          ))}
        </div>
      </section>

      <section id="tours" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
        <h2 className="text-2xl font-bold">Tour đang mở bán</h2>
        <p className="mt-1 text-slate-500">{tours.length} hành trình, khởi hành hằng tuần</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => (
            <Link key={tour.id} href={`/tours/${tour.slug}`} className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <TourCover title={tour.title} location={tour.location} imageUrl={tour.imageUrl} className="h-44 w-full" />
              <div className="p-4">
                <h3 className="font-semibold leading-snug group-hover:text-brand">{tour.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{tour.summary}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1"><Clock size={13} /> {tour.durationDays}N{tour.durationNights}Đ</span>
                  <span className="inline-flex items-center gap-1"><MapPin size={13} /> {tour.departFrom}</span>
                  {tour.nextDate && <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {dateVN(tour.nextDate)}</span>}
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div><span className="text-xs text-slate-500">Từ</span> <span className="text-lg font-bold text-brand">{vnd(tour.basePrice)}</span></div>
                  <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">Đặt ngay</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="tu-van" className="scroll-mt-20 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">Cần tour theo yêu cầu?</h2>
            <p className="mt-2 text-slate-600">Đoàn công ty, gia đình, tuần trăng mật… Để lại thông tin, chuyên viên sẽ gọi tư vấn lịch trình và báo giá chi tiết.</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>✓ Ưu tiên số điện thoại để được gọi lại nhanh nhất</li>
              <li>✓ Không cần tạo tài khoản</li>
              <li>✓ Thông tin chỉ dùng để liên hệ tư vấn</li>
            </ul>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
