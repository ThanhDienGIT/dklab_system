import { ArrowRight, Headphones, MousePointerClick, PhoneCall, QrCode, ShieldCheck, Star, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Guide, type GuideStep } from "@/components/Guide";
import { CountUp, Hero3D, Reveal } from "@/components/motion";
import { ContactForm } from "@/components/site/BookingForm";
import { gradientFor } from "@/components/site/TourCover";
import { ToursExplorer } from "@/components/site/ToursExplorer";
import { getPublicCatalog, getPublicTours } from "@/lib/public-data";
import { EngineHome } from "@/components/site/engines/EngineHome";
import { getPreset } from "@/modules/presets";
import { getTenantCached } from "@/lib/tenant";

export async function generateMetadata({ params }: PageProps<"/s/[tenant]">): Promise<Metadata> {
  const t = await getTenantCached((await params).tenant);
  return { title: t ? `${t.name} – ${t.settings.brand?.tagline ?? "Đặt tour du lịch"}` : "Không tìm thấy", description: t?.settings.brand?.tagline };
}

const short = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tr` : `${Math.round(n / 1000)}k`);

const GUIDE: GuideStep[] = [
  { target: "filter", title: "Lọc nhanh theo nhu cầu", body: "Chọn số ngày, mức giá hoặc gõ tên điểm đến (gõ không dấu cũng được) để thu hẹp danh sách tour." },
  { target: "tours", title: "Chọn một tour", body: "Bấm vào thẻ tour để xem lịch trình chi tiết, các ngày khởi hành và số chỗ còn trống." },
  { target: "how", title: "Đặt tour chỉ 3 bước", body: "Không cần tạo tài khoản. Bạn để lại họ tên và số điện thoại, nhân viên sẽ gọi xác nhận rồi gửi mã QR thanh toán." },
  { target: "consult", title: "Cần tư vấn riêng?", body: "Các ô có dấu * là bắt buộc. Khung “Thông tin bắt buộc” cho biết bạn đã điền đủ chưa trước khi gửi." },
  { target: "hotline", title: "Gọi trực tiếp", body: "Muốn nói chuyện ngay? Bấm số hotline ở góc trên để gọi cho nhân viên tư vấn." },
];

export default async function Home({ params }: PageProps<"/s/[tenant]">) {
  const t = await getTenantCached((await params).tenant);
  if (!t) notFound();
  // Ngành khác du lịch: trang chủ theo động cơ của plugin (slots / tables / rooms)
  const preset = getPreset(t.industry);
  if (preset.engine !== "tours") return <EngineHome t={t} preset={preset} catalog={await getPublicCatalog(t.id)} />;
  const tours = await getPublicTours(t.id);
  const heroCards = tours.slice(0, 3).map((x) => ({ title: x.title, location: x.location, price: short(x.basePrice), href: `/tours/${x.slug}`, gradient: gradientFor(x.location ?? x.title) }));
  const minPrice = tours.length ? Math.min(...tours.map((x) => x.basePrice)) : 0;

  return (
    <>
      {/* ───────── Hero ───────── */}
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgb(14_165_233/0.55),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgb(234_88_12/0.35),transparent_50%)]" />
        <div className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
                <ShieldCheck size={14} className="text-sky-300" /> Giá trọn gói · Xác nhận qua điện thoại · Hóa đơn VAT
              </p>
            </Reveal>
            <Reveal i={1}>
              <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                <span className="text-shimmer">{t.settings.brand?.tagline?.split("–")[0]?.trim() || "Hành trình trọn vẹn"}</span>
                <br />
                <span className="text-white/90">khắp Việt Nam</span>
              </h1>
            </Reveal>
            <Reveal i={2}>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg">
                Chọn tour, để lại số điện thoại. Nhân viên gọi xác nhận chỗ và gửi mã QR thanh toán. Không cần tạo tài khoản.
              </p>
            </Reveal>
            <Reveal i={3}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="#tours" className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-orange-600 px-6 font-semibold text-slate-950 shadow-lg shadow-orange-600/30 transition hover:-translate-y-0.5 hover:bg-orange-500">
                  Xem tour đang mở bán <ArrowRight size={18} className="transition group-hover:translate-x-1" />
                </Link>
                <Link href="#tu-van" className="inline-flex min-h-12 items-center rounded-full border border-white/25 px-6 font-semibold transition hover:bg-white/10">
                  Nhờ tư vấn miễn phí
                </Link>
              </div>
            </Reveal>
            <Reveal i={4}>
              <div className="mt-8 flex items-center gap-3 text-sm text-slate-300">
                <div className="flex -space-x-2" aria-hidden>
                  {["bg-sky-400", "bg-orange-400", "bg-emerald-400", "bg-fuchsia-400"].map((c, k) => (
                    <span key={c} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-950 text-xs font-bold text-slate-950 ${c}`}>{"MTHL"[k]}</span>
                  ))}
                </div>
                <span className="flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" /> 4,9/5 từ 1.200+ khách</span>
              </div>
            </Reveal>
          </div>
          <Reveal i={2}>
            <Hero3D cards={heroCards} />
          </Reveal>
        </div>
      </section>

      {/* ───────── Số liệu ───────── */}
      <section className="border-b bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 text-center sm:grid-cols-4">
          {[
            { v: 12000, s: "+", l: "Khách đã đồng hành" },
            { v: tours.length, s: "", l: "Tour mở bán" },
            { v: 15, s: " phút", l: "Gọi lại xác nhận" },
            { v: 98, s: "%", l: "Khách hài lòng" },
          ].map((x, i) => (
            <Reveal key={x.l} i={i}>
              <div className="text-3xl font-bold text-slate-900 sm:text-4xl"><CountUp to={x.v} suffix={x.s} /></div>
              <div className="mt-1 text-sm text-slate-500">{x.l}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── Cách đặt tour ───────── */}
      <section className="bg-sky-50/60">
        <div data-guide="how" className="mx-auto max-w-6xl px-4 py-14">
          <Reveal><h2 className="text-center text-2xl font-bold sm:text-3xl">Đặt tour chỉ 3 bước</h2></Reveal>
          <div className="relative mt-10 grid gap-6 md:grid-cols-3">
            <div className="absolute left-[16%] right-[16%] top-8 hidden h-0.5 bg-gradient-to-r from-sky-300 via-orange-300 to-emerald-300 md:block" aria-hidden />
            {[
              { i: MousePointerClick, t: "Chọn tour & ngày đi", d: "Xem lịch khởi hành và số chỗ còn trống được cập nhật liên tục." },
              { i: PhoneCall, t: "Để lại số điện thoại", d: "Chỉ cần họ tên + SĐT (hoặc email). Nhân viên gọi lại xác nhận." },
              { i: QrCode, t: "Quét QR thanh toán", d: "Nhận hóa đơn kèm mã VietQR, quét bằng mọi app ngân hàng." },
            ].map((x, k) => (
              <Reveal key={x.t} i={k} className="relative rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200/70">
                <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-lg shadow-sky-500/30">
                  <x.i size={26} />
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-slate-950 ring-4 ring-white">{k + 1}</span>
                </span>
                <h3 className="mt-4 font-semibold">{x.t}</h3>
                <p className="mt-1 text-sm text-slate-600">{x.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Danh sách tour ───────── */}
      <section id="tours" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Tour đang mở bán</h2>
              <p className="mt-1 text-slate-500">{tours.length} hành trình, giá từ {short(minPrice)}, khởi hành hằng tuần</p>
            </div>
          </div>
        </Reveal>
        <ToursExplorer tours={tours} />
      </section>

      {/* ───────── Cam kết + tư vấn ───────── */}
      <section id="tu-van" className="scroll-mt-20 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
          <div>
            <Reveal><h2 className="text-2xl font-bold sm:text-3xl">Cần tour theo yêu cầu?</h2></Reveal>
            <Reveal i={1}><p className="mt-3 text-slate-300">Đoàn công ty, gia đình, tuần trăng mật… Để lại thông tin, chuyên viên gọi tư vấn lịch trình và báo giá chi tiết.</p></Reveal>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { i: Headphones, t: "Tư vấn 1-1", d: "Người thật, gọi lại nhanh" },
                { i: Wallet, t: "Thanh toán VietQR", d: "Mọi ngân hàng, không phí" },
                { i: ShieldCheck, t: "Hóa đơn điện tử", d: "Xuất HĐ VAT cho công ty" },
                { i: Star, t: "Hoàn tiền rõ ràng", d: "Hủy trước 7 ngày hoàn 100%" },
              ].map((x, k) => (
                <Reveal key={x.t} i={k} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition hover:border-white/25 hover:bg-white/10">
                  <x.i size={20} className="text-sky-300" />
                  <div className="mt-2 font-semibold">{x.t}</div>
                  <div className="text-sm text-slate-400">{x.d}</div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal i={1} className="text-slate-900">
            <ContactForm />
          </Reveal>
        </div>
      </section>

      <Guide steps={GUIDE} storageKey={`home:${t.slug}`} />
    </>
  );
}
