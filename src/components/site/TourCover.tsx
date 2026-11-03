/** Ảnh bìa tour: dùng ảnh thật nếu có, không thì gradient theo tên điểm đến (không phụ thuộc ảnh bên ngoài). */
const GRADIENTS = [
  "from-cyan-600 to-blue-800", "from-emerald-500 to-teal-800", "from-amber-500 to-rose-700",
  "from-sky-500 to-indigo-700", "from-lime-500 to-emerald-800", "from-fuchsia-500 to-purple-800",
];
export function TourCover({ title, location, imageUrl, className = "" }: { title: string; location?: string | null; imageUrl?: string | null; className?: string }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={title} loading="lazy" className={`object-cover ${className}`} />;
  }
  const h = [...(location ?? title)].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <div className={`relative flex items-end overflow-hidden bg-gradient-to-br p-4 ${GRADIENTS[h % GRADIENTS.length]} ${className}`}>
      <svg className="absolute inset-0 h-full w-full opacity-20" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden>
        <path d="M0 160 L80 90 L140 140 L220 60 L300 130 L400 70 L400 200 L0 200 Z" fill="white" />
        <circle cx="330" cy="45" r="22" fill="white" />
      </svg>
      <span className="relative text-sm font-semibold uppercase tracking-wider text-white/90">{location}</span>
    </div>
  );
}
