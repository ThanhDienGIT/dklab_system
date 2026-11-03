"use client";
import { ArrowRight, CalendarDays, Clock, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Reveal, Tilt } from "@/components/motion";
import { TourCover } from "@/components/site/TourCover";
import { dateVN, vnd } from "@/lib/format";

type T = {
  id: string; slug: string; title: string; summary: string | null; location: string | null; departFrom: string | null;
  durationDays: number; durationNights: number; basePrice: number; imageUrl: string | null; nextDate: string | null;
};

const FILTERS = [
  { key: "all", label: "Tất cả", test: () => true },
  { key: "short", label: "Ngắn ngày (≤2N)", test: (t: T) => t.durationDays <= 2 },
  { key: "mid", label: "3 ngày", test: (t: T) => t.durationDays === 3 },
  { key: "long", label: "Dài ngày (4N+)", test: (t: T) => t.durationDays >= 4 },
  { key: "cheap", label: "Dưới 3 triệu", test: (t: T) => t.basePrice < 3_000_000 },
];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();

/** Lưới tour có lọc nhanh + tìm kiếm không dấu, thẻ nghiêng 3D. */
export function ToursExplorer({ tours }: { tours: T[] }) {
  const [f, setF] = useState("all");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const test = FILTERS.find((x) => x.key === f)!.test;
    const k = fold(q.trim());
    return tours.filter((t) => test(t) && (!k || fold(`${t.title} ${t.location} ${t.departFrom}`).includes(k)));
  }, [tours, f, q]);

  return (
    <>
      <div data-guide="filter" className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Lọc tour">
          {FILTERS.map((x) => (
            <button
              key={x.key}
              role="tab"
              aria-selected={f === x.key}
              onClick={() => setF(x.key)}
              className={`min-h-10 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition ${
                f === x.key ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <label className="relative md:ml-auto md:w-72">
          <span className="sr-only">Tìm tour</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input h-10 rounded-full pl-9" placeholder="Tìm: ha long, phu quoc…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      <p className="mt-3 text-sm text-slate-500" aria-live="polite">{list.length} tour phù hợp</p>

      <div data-guide="tours" className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((tour, i) => (
          <Reveal key={tour.id} i={i % 6}>
            <Tilt className="relative h-full rounded-3xl">
              <Link href={`/tours/${tour.slug}`} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <div className="relative overflow-hidden">
                  <TourCover title={tour.title} location={tour.location} imageUrl={tour.imageUrl} className="h-48 w-full transition duration-700 group-hover:scale-105" />
                  <span className="tilt-pop absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800 shadow backdrop-blur">
                    {tour.durationDays}N{tour.durationNights}Đ
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-semibold leading-snug text-slate-900 group-hover:text-brand">{tour.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{tour.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1"><MapPin size={13} /> {tour.departFrom}</span>
                    {tour.nextDate && <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {dateVN(tour.nextDate)}</span>}
                    <span className="inline-flex items-center gap-1"><Clock size={13} /> {tour.durationDays} ngày</span>
                  </div>
                  <div className="mt-auto flex items-end justify-between pt-4">
                    <div>
                      <span className="text-xs text-slate-500">Từ</span>{" "}
                      <span className="text-xl font-bold text-slate-900">{vnd(tour.basePrice)}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 transition group-hover:bg-orange-600 group-hover:text-slate-950">
                      Đặt ngay <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </Tilt>
          </Reveal>
        ))}
      </div>
      {!list.length && (
        <div className="mt-6 rounded-2xl border border-dashed p-10 text-center text-slate-500">
          Không có tour phù hợp.{" "}
          <button className="font-medium text-brand underline" onClick={() => { setF("all"); setQ(""); }}>Xem tất cả</button>
        </div>
      )}
    </>
  );
}
