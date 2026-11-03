import { CalendarDays, Check, Clock, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Guide, type GuideStep } from "@/components/Guide";
import { Reveal } from "@/components/motion";
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

const GUIDE: GuideStep[] = [
  { target: "schedule", title: "Xem ngày đi & chỗ trống", body: "Bảng này cho biết các ngày khởi hành, số chỗ còn lại và giá. Chữ đỏ nghĩa là sắp hết chỗ." },
  { target: "date", title: "Chọn ngày khởi hành", body: "Chọn ngày phù hợp. Nếu chưa chắc, chọn “Ngày khác: nhờ tư vấn”." },
  { target: "people", title: "Số người đi", body: "Bấm + / − để chọn số người lớn và trẻ em. Giá tạm tính tự cập nhật." },
  { target: "required", title: "Thông tin bắt buộc", body: "Khung này đánh dấu ✓ khi bạn điền đủ: họ tên, SĐT (hoặc email) và đồng ý liên hệ. Ô có dấu * là bắt buộc." },
  { target: "contact", title: "Để lại số điện thoại", body: "Ưu tiên SĐT để nhân viên gọi xác nhận nhanh. Nếu nhập sai định dạng, hệ thống báo ngay dưới ô." },
  { target: "submit", title: "Gửi yêu cầu", body: "Chưa cần thanh toán. Chỗ chỉ được giữ sau khi nhân viên gọi xác nhận, sau đó bạn nhận mã QR thanh toán." },
];

export default async function TourPage({ params }: PageProps<"/s/[tenant]/tours/[slug]">) {
  const r = await load(params);
  if (!r) notFound();
  const { tour } = r;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav className="mb-4 text-sm text-slate-500"><Link href="/" className="hover:text-brand">Trang chủ</Link> / <Link href="/#tours" className="hover:text-brand">Tour</Link> / <span className="text-slate-800">{tour.title}</span></nav>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <Reveal>
            <TourCover title={tour.title} location={tour.location} imageUrl={tour.imageUrl} className="h-56 w-full rounded-3xl sm:h-80" />
          </Reveal>
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

          <section className="mt-6" data-guide="schedule">
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

        <aside id="dat-tour" className="scroll-mt-20 lg:sticky lg:top-20 lg:self-start">
          <Reveal i={1} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
            <div className="mb-4">
              <span className="text-sm text-slate-500">Giá từ</span>
              <div className="text-2xl font-bold text-brand">{vnd(tour.basePrice)}<span className="text-sm font-normal text-slate-500"> /người lớn</span></div>
              {tour.childPrice > 0 && <div className="text-sm text-slate-500">Trẻ em: {vnd(tour.childPrice)}</div>}
            </div>
            <BookingForm tour={tour} />
          </Reveal>
        </aside>
      </div>

      {/* Thanh đặt nhanh cố định trên điện thoại */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgb(15_23_42/0.25)] backdrop-blur lg:hidden">
        <div>
          <div className="text-xs text-slate-500">Giá từ</div>
          <div className="text-lg font-bold text-slate-900">{vnd(tour.basePrice)}</div>
        </div>
        <a href="#dat-tour" className="inline-flex min-h-11 items-center rounded-xl bg-orange-600 px-5 font-semibold text-slate-950">Đặt tour</a>
      </div>
      <div className="h-16 lg:hidden" aria-hidden />
      <Guide steps={GUIDE} storageKey="tour-page" label="Hướng dẫn" position="bottom-20 right-4 lg:bottom-4" />
    </div>
  );
}
