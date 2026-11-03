"use client";
/**
 * Hướng dẫn sử dụng từng bước (coach marks).
 *  - Làm nổi bật phần tử có data-guide="<key>", tối phần còn lại
 *  - Nút Quay lại / Tiếp / Bỏ qua, phím ← → Esc, focus vào hộp hướng dẫn
 *  - Tự mở lần đầu (nhớ bằng localStorage), mở lại bằng nút "Hướng dẫn"
 *  - Tôn trọng prefers-reduced-motion
 */
import { ChevronLeft, ChevronRight, CircleHelp, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type GuideStep = { target: string; title: string; body: string };

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;

function readSeen(key: string) {
  try {
    return localStorage.getItem(`guide:${key}`) === "1";
  } catch {
    return true;
  }
}
function markSeen(key: string) {
  try {
    localStorage.setItem(`guide:${key}`, "1");
  } catch {}
}

export function Guide({ steps, storageKey, autoStart = true, label = "Hướng dẫn", position = "bottom-4 right-4" }: { steps: GuideStep[]; storageKey: string; autoStart?: boolean; label?: string; position?: string }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState({ w: 1024, h: 768 });

  // Chỉ giữ các bước có phần tử thật trên trang
  const available = useCallback(() => steps.filter((s) => document.querySelector(`[data-guide="${s.target}"]`)), [steps]);
  const [list, setList] = useState<GuideStep[]>([]);

  const start = useCallback(() => {
    const l = available();
    if (!l.length) return;
    setList(l);
    setI(0);
    setOpen(true);
  }, [available]);

  const close = useCallback(() => {
    setOpen(false);
    markSeen(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (!autoStart || readSeen(storageKey)) return;
    const t = setTimeout(start, 1200);
    return () => clearTimeout(t);
  }, [autoStart, storageKey, start]);

  const step = list[i];

  // Đo vị trí phần tử mục tiêu, cuộn tới nó
  useLayoutEffect(() => {
    if (!open || !step) return;
    const el = document.querySelector<HTMLElement>(`[data-guide="${step.target}"]`);
    if (!el) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
      setVp({ w: window.innerWidth, h: window.innerHeight });
    };
    measure();
    const t = setTimeout(measure, 450); // sau khi cuộn mượt xong
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    boxRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, list.length - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, list.length, i]);

  // Vị trí hộp hướng dẫn: dưới mục tiêu nếu đủ chỗ, không thì phía trên
  const boxW = Math.min(340, vp.w - 24);
  let boxStyle: React.CSSProperties = { left: 12, bottom: 12, width: boxW };
  if (rect) {
    const below = rect.top + rect.height + 12;
    const left = Math.min(Math.max(12, rect.left), vp.w - boxW - 12);
    boxStyle = below + 190 < vp.h ? { top: below, left, width: boxW } : { top: Math.max(12, rect.top - 12 - 190), left, width: boxW };
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        className={`no-print fixed ${position} z-40 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-3 ring-2 ring-white/70 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:-translate-y-0.5 hover:bg-slate-800`}
        aria-label="Mở hướng dẫn sử dụng"
      >
        <CircleHelp size={18} /> {label}
      </button>

      {open && step && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="guide-title" aria-describedby="guide-body">
          {/* Lớp tối có "lỗ" sáng quanh phần tử mục tiêu */}
          <div className="absolute inset-0" onClick={close} />
          {rect && (
            <div
              className="pointer-events-none absolute rounded-2xl ring-4 ring-orange-400/90 transition-all duration-300 ease-out"
              style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxShadow: "0 0 0 9999px rgb(15 23 42 / 0.62)" }}
            />
          )}
          <div ref={boxRef} tabIndex={-1} className="pop-in absolute rounded-2xl bg-white p-4 shadow-2xl outline-none" style={boxStyle} key={i}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-600">
                Bước {i + 1}/{list.length}
              </span>
              <button onClick={close} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng hướng dẫn">
                <X size={16} />
              </button>
            </div>
            <h3 id="guide-title" className="font-semibold text-slate-900">{step.title}</h3>
            <p id="guide-body" className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
            <div className="mt-3 flex items-center gap-1" aria-hidden>
              {list.map((_, k) => (
                <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-orange-500" : "w-1.5 bg-slate-300"}`} />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <button onClick={close} className="text-sm text-slate-500 hover:text-slate-800">Bỏ qua</button>
              <div className="flex gap-2">
                {i > 0 && (
                  <button onClick={() => setI(i - 1)} className="inline-flex min-h-10 items-center gap-1 rounded-lg border px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <ChevronLeft size={16} /> Quay lại
                  </button>
                )}
                {i < list.length - 1 ? (
                  <button onClick={() => setI(i + 1)} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800">
                    Tiếp <ChevronRight size={16} />
                  </button>
                ) : (
                  <button onClick={close} className="min-h-10 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-slate-950 hover:bg-orange-500">
                    Đã hiểu
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
