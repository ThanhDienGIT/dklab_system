import { CalendarDays, Check, Clock, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/site/BookingForm";
import { TourCover } from "@/components/site/TourCover";
import { dateVN, vnd } from "@/lib/format";
import { getPublicTour } from "@/lib/public-data";
import { getTenantCached } from "@/lib/tenant";

async function load(params: PageProps<"/s/[tenant]/tours/[slug]">["params"]) {
  const { tenant, slug } = await params;
  const t = await getTenantCached(tenant);
  if (!t) return null;
  const tour = await getPublicTour(t.id, slug);
  return tour ? { t, tour } : null;
}

export async function generateMetadata({ params }: PageProps<"/s/[tenant]/tours/[slug]">): Promise<Metadata> {
  const r = await load(params);
  return r ? { title: `${r.tour.title} | ${r.t.name}`, description: r.tour.summary ?? undefined } : { title: "Không tìm thấy tour" };
}

export default async function TourPage({ params }: PageProps<"/s/[tenant]/tours/[slug]">) {
  const r = await load(params);
  if (!r) notFound();
  const { tour } = r;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav className="mb-4 text-sm text-slate-500"><Link href="/" className="hover:text-brand">Trang chủ</Link> / <Link href="/#tours" className="hover:text-brand">Tour</Link> / <span className="text-slate-800">{tour.title}</span></nav>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <TourCover title={tour.title} location={tour.location} imageUrl={tour.imageUrl} className="h-56 w-full rounded-2xl sm:h-72" />
          <h1 className="mt-5 text-2xl font-bold sm:text-3xl">{tour.title}</h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1"><Clock size={15} /> {tour.durationDays} ngày {tour.durationNights} đêm</span>
            <span className="inline-flex items-center gap-1"><MapPin size={15} /> Khởi hành: {tour.departFrom}</span>
          </div>
          <p className="mt-4 text-slate-700">{tour.summary}</p>

          {!!tour.highlights.length && (
            <section className="mt-6 rounded-2xl bg-slate-50 p-5">
              <h2 className="mb-3 font-semibold">Điểm nổi bật</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {tour.highlights.map((h) => <li key={h} className="flex gap-2 text-sm"><Check size={16} className="mt-0.5 shrink-0 text-brand" /> {h}</li>)}
              </ul>
            </section>
          )}

          {!!tour.itinerary.length && (
            <section className="mt-6">
              <h2 className="mb-3 text-lg font-semibold">Lịch trình</h2>
              <ol className="relative space-y-4 border-l-2 border-brand/20 pl-5">
                {tour.itinerary.map((d) => (
                  <li key={d.day} className="relative">
                    <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-brand" />
                    <div className="text-xs font-semibold uppercase text-brand">{d.day}</div>
                    <div className="font-medium">{d.title}</div>
                    <p className="text-sm text-slate-600">{d.detail}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="mt-6">
            <h2 className="mb-3 text-lg font-semibold">Lịch khởi hành & chỗ trống</h2>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-2">Ngày đi</th><th>Chỗ trống</th><th className="px-4 text-right">Giá người lớn</th></tr></thead>
                <tbody className="divide-y">
                  {tour.departures.map((d) => {
                    const left = d.seatsTotal - d.seatsBooked;
                    return (
                      <tr key={d.id} className={d.status !== "open" || left <= 0 ? "text-slate-400" : ""}>
                        <td className="px-4 py-2.5 font-medium"><CalendarDays size={14} className="mr-1 inline" /> {dateVN(d.departDate)}</td>
                        <td>{d.status !== "open" ? "Đã đóng" : left <= 0 ? "Hết chỗ" : <span className={left <= 5 ? "font-semibold text-rose-600" : "text-emerald-700"}>Còn {left} chỗ</span>}</td>
                        <td className="px-4 text-right font-semibold">{vnd(d.price ?? tour.basePrice)}</td>
                      </tr>
                    );
                  })}
                  {!tour.departures.length && <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-500">Liên hệ để được báo lịch khởi hành</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          {tour.description && (
            <section className="mt-6">
              <h2 className="mb-2 text-lg font-semibold">Thông tin chi tiết</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{tour.description}</p>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border bg-white p-5 shadow-lg shadow-slate-200/60">
            <div className="mb-4">
              <span className="text-sm text-slate-500">Giá từ</span>
              <div className="text-2xl font-bold text-brand">{vnd(tour.basePrice)}<span className="text-sm font-normal text-slate-500"> /người lớn</span></div>
              {tour.childPrice > 0 && <div className="text-sm text-slate-500">Trẻ em: {vnd(tour.childPrice)}</div>}
            </div>
            <BookingForm tour={tour} />
          </div>
        </aside>
      </div>
    </div>
  );
}
