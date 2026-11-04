import { BedDouble, Calculator, CalendarDays, Clock, Coffee, MapPin, Phone, ShieldCheck, Sparkles, UtensilsCrossed, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Guide, type GuideStep } from "@/components/Guide";
import { Hero3D, Reveal } from "@/components/motion";
import { gradientFor } from "@/components/site/TourCover";
import { vnd } from "@/lib/format";
import type { PublicCatalog } from "@/lib/public-data";
import type { PublicTenant } from "@/lib/tenant";
import type { IndustryPreset } from "@/modules/presets";
import { PickButton, RoomBooking, SlotBooking, TableBooking } from "./widgets";

const ICONS: Record<string, LucideIcon> = { sparkles: Sparkles, coffee: Coffee, utensils: UtensilsCrossed, bed: BedDouble, calculator: Calculator, calendar: CalendarDays };
const short = (n: number) => (n === 0 ? "Miễn phí" : n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tr` : `${Math.round(n / 1000)}k`);

function guideFor(p: IndustryPreset): GuideStep[] {
  const L = p.labels;
  const common: GuideStep[] = [{ target: "catalog", title: `Xem ${L.catalogNav.toLowerCase()}`, body: p.engine === "tables" && !p.booking.preorder ? "Tham khảo menu và giá trước khi đến quán." : `Bấm nút trên mỗi ${L.item.toLowerCase()} để chọn nhanh vào form đặt chỗ.` }];
  const tail: GuideStep[] = [
    { target: "required", title: "Thông tin bắt buộc", body: "Khung này đánh dấu ✓ khi bạn điền đủ. Ô có dấu * là bắt buộc; ưu tiên số điện thoại để được gọi xác nhận." },
    { target: "submit", title: "Gửi yêu cầu", body: "Chưa cần thanh toán. Chỗ được giữ tạm, nhân viên sẽ gọi xác nhận trong giờ làm việc." },
  ];
  if (p.engine === "slots")
    return [...common, { target: "pick-item", title: `Chọn ${L.item.toLowerCase()}`, body: "Mỗi dịch vụ có thời lượng riêng, hệ thống tự tính giờ còn trống." }, { target: "pick-date", title: "Chọn ngày", body: "Vuốt ngang để xem 10 ngày tới." }, { target: "pick-time", title: "Chọn giờ còn trống", body: "Giờ gạch ngang là đã kín. Có thể chọn riêng người phục vụ nếu muốn." }, ...tail];
  if (p.engine === "tables")
    return [...common, { target: "pick-date", title: "Ngày, giờ đến & số khách", body: "Chọn giờ đến và số người, sơ đồ bên dưới sẽ cập nhật bàn trống." }, { target: "pick-table", title: "Chọn bàn trên sơ đồ", body: "Bàn xanh là còn trống và đủ chỗ. Không chọn cũng được, quán sẽ tự xếp bàn phù hợp." }, ...(p.booking.preorder ? [{ target: "preorder", title: "Chọn món trước", body: "Không bắt buộc. Bếp sẽ chuẩn bị sẵn khi bạn tới." }] : []), ...tail];
  return [...common, { target: "pick-date", title: "Chọn ngày nhận – trả phòng", body: "Nhận phòng từ 14:00, trả phòng trước 12:00." }, { target: "pick-room", title: "Chọn loại phòng", body: "Danh sách hiển thị số phòng còn trống và tổng tiền theo số đêm." }, ...tail];
}

export function EngineHome({ t, preset, catalog }: { t: PublicTenant; preset: IndustryPreset; catalog: PublicCatalog }) {
  const Icon = ICONS[preset.icon] ?? Sparkles;
  const L = preset.labels;
  const c = t.settings.contact ?? {};
  const items = catalog.items;
  const cards = items.slice(0, 3).map((x) => ({ title: x.name, location: catalog.categories.find((k) => k.id === x.categoryId)?.name ?? L.item, price: short(x.price), href: "#dat-cho", gradient: gradientFor(x.name) }));
  const cfg = { ...preset.booking, ...(t.settings.booking ?? {}) };
  const pickLabel = preset.engine === "slots" ? L.booking : preset.engine === "rooms" ? "Chọn phòng" : preset.booking.preorder ? "Thêm món" : null;

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 -z-10 opacity-90" style={{ background: `radial-gradient(ellipse at top left, color-mix(in srgb, var(--brand) 75%, transparent), transparent 60%), radial-gradient(ellipse at bottom right, rgb(234 88 12 / 0.35), transparent 55%)` }} />
        <div className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <Reveal><p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur"><Icon size={14} /> {preset.name} · {L.booking} online</p></Reveal>
            <Reveal i={1}><h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"><span className="text-shimmer">{t.name}</span></h1></Reveal>
            <Reveal i={2}><p className="mt-3 text-xl font-medium text-white/90">{t.settings.brand?.tagline ?? preset.tagline}</p></Reveal>
            <Reveal i={3}><p className="mt-4 max-w-lg leading-relaxed text-slate-300">{preset.heroText}</p></Reveal>
            <Reveal i={4}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="#dat-cho" className="inline-flex min-h-12 items-center rounded-full bg-orange-600 px-6 font-semibold text-slate-950 shadow-lg shadow-orange-600/30 transition hover:-translate-y-0.5 hover:bg-orange-500">{L.booking} ngay</Link>
                <Link href="#danh-muc" className="inline-flex min-h-12 items-center rounded-full border border-white/25 px-6 font-semibold transition hover:bg-white/10">Xem {L.catalogNav.toLowerCase()}</Link>
              </div>
            </Reveal>
            <Reveal i={5}>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
                <span className="inline-flex items-center gap-1.5"><Clock size={15} /> {cfg.open} – {cfg.close}</span>
                {c.address && <span className="inline-flex items-center gap-1.5"><MapPin size={15} /> {c.address}</span>}
              </div>
            </Reveal>
          </div>
          {cards.length > 0 && <Reveal i={2}><Hero3D cards={cards} /></Reveal>}
        </div>
      </section>

      {/* Danh mục */}
      <section id="danh-muc" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <Reveal><h2 className="text-2xl font-bold sm:text-3xl">{L.catalogNav}</h2></Reveal>
        <div data-guide="catalog" className="mt-6 space-y-10">
          {catalog.categories.map((cat) => {
            const list = items.filter((x) => x.categoryId === cat.id);
            if (!list.length) return null;
            return (
              <div key={cat.id}>
                <Reveal><h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">{cat.name}</h3></Reveal>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((it, k) => (
                    <Reveal key={it.id} i={k % 6} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold leading-snug">{it.name}</h4>
                        {it.tags.map((g) => <span key={g} className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">{g}</span>)}
                      </div>
                      {it.description && <p className="mt-1 text-sm text-slate-500">{it.description}</p>}
                      <div className="mt-auto flex items-end justify-between pt-4">
                        <div>
                          <div className="text-lg font-bold">{it.price ? vnd(it.price) : "Miễn phí"}{preset.engine === "rooms" && <span className="text-xs font-normal text-slate-500"> /đêm</span>}</div>
                          <div className="text-xs text-slate-500">
                            {it.durationMin ? `${it.durationMin} phút` : null}
                            {preset.engine === "rooms" && it.capacity ? `Tối đa ${it.capacity} khách` : null}
                          </div>
                        </div>
                        {pickLabel && <PickButton id={it.id} label={pickLabel} />}
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            );
          })}
          {!items.length && <p className="text-slate-500">Đang cập nhật.</p>}
        </div>
      </section>

      {/* Đặt chỗ */}
      <section id="dat-cho" className="scroll-mt-20 bg-sky-50/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <Reveal><h2 className="text-2xl font-bold sm:text-3xl">{L.booking}</h2></Reveal>
            <Reveal i={1}><p className="mt-2 text-slate-600">Không cần tạo tài khoản. Chọn thời gian, để lại số điện thoại, nhân viên sẽ gọi xác nhận.</p></Reveal>
            <ol className="mt-6 space-y-3">
              {["Chọn thời gian phù hợp", preset.engine === "tables" ? "Chọn bàn còn trống trên sơ đồ" : preset.engine === "rooms" ? "Chọn loại phòng còn trống" : `Chọn ${L.item.toLowerCase()} và giờ trống`, "Nhận cuộc gọi xác nhận & mã QR thanh toán"].map((s, k) => (
                <Reveal key={s} i={k} as="li" className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-sm font-bold text-white">{k + 1}</span>
                  <span className="text-sm font-medium">{s}</span>
                </Reveal>
              ))}
            </ol>
            <div className="mt-6 space-y-2 text-sm text-slate-600">
              {(c.hotline || c.phone) && <a href={`tel:${(c.hotline || c.phone)!.replace(/\s/g, "")}`} className="flex items-center gap-2 font-semibold text-slate-900"><Phone size={16} /> {c.hotline || c.phone}</a>}
              <p className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600" /> Thanh toán VietQR · Xuất hóa đơn VAT</p>
            </div>
          </div>
          <Reveal i={1} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6">
            {preset.engine === "slots" && <SlotBooking items={items} labels={L} />}
            {preset.engine === "tables" && <TableBooking menu={items} preorder={preset.booking.preorder} />}
            {preset.engine === "rooms" && <RoomBooking />}
          </Reveal>
        </div>
      </section>
      <Guide steps={guideFor(preset)} storageKey={`home:${t.slug}`} />
    </>
  );
}
