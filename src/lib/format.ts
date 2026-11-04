export const vnd = (n: number | null | undefined) => `${(n ?? 0).toLocaleString("vi-VN")}₫`;
export const num = (n: number | null | undefined) => (n ?? 0).toLocaleString("vi-VN");
/** Mọi ngày giờ hiển thị theo giờ Việt Nam, không phụ thuộc múi giờ máy người xem */
export const VN_TZ = "Asia/Ho_Chi_Minh";
export function dateVN(d: string | Date | null | undefined) {
  if (!d) return "";
  // Chuỗi "YYYY-MM-DD" là ngày lịch (không có giờ) => hiển thị nguyên ngày đó
  if (typeof d === "string" && d.length === 10) return d.split("-").reverse().join("/");
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: VN_TZ });
}
export const timeVN = (d: string | Date) => new Date(d).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: VN_TZ });
export const dayMonthVN = (d: string | Date) => new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", timeZone: VN_TZ });
export function dateTimeVN(d: string | Date | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric", timeZone: VN_TZ });
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
