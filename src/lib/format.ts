export const vnd = (n: number | null | undefined) => `${(n ?? 0).toLocaleString("vi-VN")}₫`;
export const num = (n: number | null | undefined) => (n ?? 0).toLocaleString("vi-VN");
export function dateVN(d: string | Date | null | undefined) {
  if (!d) return "";
  const x = typeof d === "string" ? new Date(d.length === 10 ? `${d}T00:00:00` : d) : d;
  return x.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
export function dateTimeVN(d: string | Date | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}
export function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
}
export const telHref = (p?: string | null) => (p ? `tel:${p.replace(/\s/g, "")}` : undefined);
export const zaloHref = (p?: string | null) => (p ? `https://zalo.me/${p.replace(/\s/g, "")}` : undefined);
