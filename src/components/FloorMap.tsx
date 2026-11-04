"use client";
/**
 * Sơ đồ bàn theo lưới 12 x 8 (dùng cho trang khách + trang quản trị).
 *  - Chế độ chọn: bấm bàn để chọn (bàn bận / không đủ chỗ bị khóa)
 *  - Chế độ sắp xếp: kéo thả bàn, tự bám lưới (editable)
 */
import { Users } from "lucide-react";
import { useRef, useState } from "react";

export const COLS = 12;
export const ROWS = 8;

export type TableState = "free" | "busy" | "reserved" | "occupied" | "small" | "selected" | "pending";
export type MapTable = { id: string; name: string; capacity: number; x: number; y: number; shape: string; state: TableState; sub?: string };

const STYLE: Record<TableState, string> = {
  free: "bg-emerald-50 border-emerald-400 text-emerald-900 hover:bg-emerald-100 hover:-translate-y-0.5 cursor-pointer",
  selected: "bg-orange-500 border-orange-600 text-slate-950 ring-4 ring-orange-300 scale-105 cursor-pointer",
  busy: "bg-slate-200 border-slate-300 text-slate-500 cursor-not-allowed",
  reserved: "bg-amber-100 border-amber-400 text-amber-900 cursor-pointer",
  pending: "bg-rose-50 border-rose-400 text-rose-800 cursor-pointer",
  occupied: "bg-sky-600 border-sky-700 text-white cursor-pointer",
  small: "bg-white border-dashed border-slate-300 text-slate-400 cursor-not-allowed",
};

export const LEGEND: { state: TableState; label: string }[] = [
  { state: "free", label: "Trống" },
  { state: "reserved", label: "Đã đặt" },
  { state: "pending", label: "Chờ xác nhận" },
  { state: "occupied", label: "Đang phục vụ" },
  { state: "busy", label: "Không khả dụng" },
];

const size = (shape: string) => (shape === "rect" ? { w: 3, h: 2 } : { w: 2, h: 2 });

export function FloorMap({ tables, onPick, editable, onMove, ariaLabel = "Sơ đồ bàn" }: {
  tables: MapTable[];
  onPick?: (id: string) => void;
  editable?: boolean;
  onMove?: (id: string, x: number, y: number) => void;
  ariaLabel?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);

  function cellFromEvent(e: React.PointerEvent, t: MapTable) {
    const r = box.current!.getBoundingClientRect();
    const { w, h } = size(t.shape);
    const cx = Math.round(((e.clientX - r.left) / r.width) * COLS - w / 2);
    const cy = Math.round(((e.clientY - r.top) / r.height) * ROWS - h / 2);
    return { x: Math.max(0, Math.min(COLS - w, cx)), y: Math.max(0, Math.min(ROWS - h, cy)) };
  }

  return (
    <div
      ref={box}
      role="group"
      aria-label={ariaLabel}
      className="relative w-full touch-none select-none overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(to_right,rgb(148_163_184/0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgb(148_163_184/0.15)_1px,transparent_1px)] bg-white"
      style={{ aspectRatio: `${COLS} / ${ROWS}`, backgroundSize: `${100 / COLS}% ${100 / ROWS}%` }}
    >
      {tables.map((t) => {
        const pos = drag?.id === t.id ? drag : t;
        const { w, h } = size(t.shape);
        const disabled = !editable && (t.state === "busy" || t.state === "small");
        return (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            aria-pressed={t.state === "selected"}
            aria-label={`${t.name}, ${t.capacity} chỗ, ${t.state === "free" ? "trống" : t.state === "selected" ? "đang chọn" : t.state === "small" ? "không đủ chỗ" : "không trống"}`}
            onClick={() => !editable && onPick?.(t.id)}
            onPointerDown={(e) => {
              if (!editable) return;
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              setDrag({ id: t.id, x: t.x, y: t.y });
            }}
            onPointerMove={(e) => drag?.id === t.id && setDrag({ id: t.id, ...cellFromEvent(e, t) })}
            onPointerUp={() => {
              if (drag?.id === t.id) {
                onMove?.(t.id, drag.x, drag.y);
                setDrag(null);
              }
            }}
            className={`absolute flex flex-col items-center justify-center border-2 text-center shadow-sm transition-all duration-200 ${
              t.shape === "round" ? "rounded-full" : "rounded-xl"
            } ${editable ? "cursor-grab border-slate-400 bg-white active:cursor-grabbing" : STYLE[t.state]} ${drag?.id === t.id ? "z-10 shadow-xl ring-4 ring-sky-300" : ""}`}
            style={{ left: `${(pos.x / COLS) * 100}%`, top: `${(pos.y / ROWS) * 100}%`, width: `${(w / COLS) * 100 - 1}%`, height: `${(h / ROWS) * 100 - 1.5}%` }}
          >
            <span className="text-sm font-bold leading-none sm:text-base">{t.name}</span>
            <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] opacity-80 sm:text-xs"><Users size={11} /> {t.capacity}</span>
            {t.sub && <span className="mt-0.5 hidden max-w-full truncate px-1 text-[10px] font-medium sm:block">{t.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Legend({ states = LEGEND }: { states?: typeof LEGEND }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate-600">
      {states.map((l) => (
        <span key={l.state} className="inline-flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded border-2 ${STYLE[l.state].split(" ").slice(0, 2).join(" ")}`} /> {l.label}
        </span>
      ))}
    </div>
  );
}
