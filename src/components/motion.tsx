"use client";
/**
 * Bộ component chuyển động nhẹ, không phụ thuộc thư viện ngoài.
 * Mọi hiệu ứng tự tắt khi người dùng bật "giảm chuyển động" (prefers-reduced-motion).
 */
import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Hiện dần khi phần tử cuộn vào màn hình. `i` = thứ tự để tạo hiệu ứng so le.
 *  Cập nhật thuộc tính DOM trực tiếp (không setState) => không render lại React. */
export function Reveal({ children, i = 0, as: Tag = "div", className = "", ...rest }: { children: ReactNode; i?: number; as?: ElementType; className?: string } & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = () => el.setAttribute("data-shown", "true");
    if (reduced() || !("IntersectionObserver" in window)) return show();
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          show();
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} data-reveal="" data-shown="false" style={{ "--i": i } as CSSProperties} className={className} {...rest}>
      {children}
    </Tag>
  );
}

/** Nghiêng 3D theo con trỏ chuột (bỏ qua trên màn hình cảm ứng). */
export function Tilt({ children, className = "", max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  function onMove(e: React.PointerEvent) {
    if (e.pointerType !== "mouse" || reduced()) return;
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", `${(x - 0.5) * max * 2}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * max * 2}deg`);
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
  }
  function reset() {
    const el = ref.current!;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }
  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={reset} className={`tilt ${className}`}>
      {children}
      <span aria-hidden className="tilt-glare pointer-events-none absolute inset-0 rounded-[inherit]" />
    </div>
  );
}

/** Đếm số từ 0 lên khi cuộn tới (ghi thẳng vào DOM, không setState mỗi khung hình). */
export function CountUp({ to, suffix = "", duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = (n: number) => `${n.toLocaleString("vi-VN")}${suffix}`;
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    let raf = 0;
    el.textContent = fmt(0);
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, duration, suffix]);
  // Giá trị cuối có sẵn trong HTML (SEO + không JS vẫn đúng)
  return <span ref={ref} className="tabular-nums">{fmt(to)}</span>;
}

export type HeroCard = { title: string; location: string | null; price: string; href: string; gradient: string };

/**
 * Cảnh 3D ở hero: 3 "bưu thiếp" tour đặt trong không gian (perspective + translateZ),
 * lơ lửng nhẹ và nghiêng theo con trỏ (parallax). Vòng quỹ đạo xoay chậm phía sau.
 */
export function Hero3D({ cards }: { cards: HeroCard[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        el.style.setProperty("--py", `${x * 14}deg`);
        el.style.setProperty("--px", `${-y * 10}deg`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const pos = [
    "left-[4%] top-[14%] [transform:translateZ(60px)_rotateY(-14deg)_rotateZ(-5deg)]",
    "right-[2%] top-[4%] [transform:translateZ(-30px)_rotateY(12deg)_rotateZ(4deg)]",
    "left-[22%] bottom-[2%] [transform:translateZ(120px)_rotateY(-4deg)_rotateZ(2deg)]",
  ];
  return (
    <div className="relative h-[340px] w-full [perspective:1100px] sm:h-[420px]" aria-hidden>
      <div
        ref={ref}
        className="absolute inset-0 transition-transform duration-700 [transform-style:preserve-3d]"
        style={{ transform: "rotateX(var(--px, 0deg)) rotateY(var(--py, 0deg))" }}
      >
        {/* Quỹ đạo + "hành tinh" phát sáng phía sau */}
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 [transform-style:preserve-3d] sm:h-[380px] sm:w-[380px]">
          <div className="orbit absolute inset-0 rounded-full border-2 border-dashed border-white/25" />
          <div className="absolute inset-[22%] rounded-full bg-gradient-to-br from-sky-300/40 via-cyan-200/20 to-orange-300/30 blur-2xl" />
        </div>
        {cards.slice(0, 3).map((c, i) => (
          <a
            key={c.href}
            href={c.href}
            tabIndex={-1}
            className={`absolute w-[46%] max-w-[230px] ${pos[i]} [transform-style:preserve-3d]`}
          >
            <div className={i % 2 ? "float-b" : "float-a"} style={{ animationDelay: `${i * -2.3}s` }}>
              <div className="overflow-hidden rounded-2xl bg-white p-2 shadow-2xl shadow-slate-950/40 ring-1 ring-white/50">
                <div className={`relative flex h-28 items-end rounded-xl bg-gradient-to-br p-3 sm:h-32 ${c.gradient}`}>
                  <svg className="absolute inset-0 h-full w-full opacity-25" viewBox="0 0 200 100" preserveAspectRatio="none">
                    <path d="M0 80 L40 45 L70 70 L110 30 L150 65 L200 35 L200 100 L0 100 Z" fill="white" />
                    <circle cx="165" cy="22" r="10" fill="white" />
                  </svg>
                  <span className="relative text-[11px] font-semibold uppercase tracking-widest text-white">{c.location}</span>
                </div>
                <div className="px-1.5 pb-1 pt-2">
                  <div className="line-clamp-1 text-[13px] font-semibold text-slate-900">{c.title}</div>
                  <div className="text-xs font-bold text-orange-600">từ {c.price}</div>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
