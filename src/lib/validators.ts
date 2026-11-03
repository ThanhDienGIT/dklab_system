import { z } from "zod";

/** Chuẩn hóa SĐT VN: bỏ khoảng trắng/dấu chấm, +84 => 0 */
export function normalizePhone(p?: string | null): string | null {
  if (!p) return null;
  let s = p.replace(/[\s.\-()]/g, "");
  if (s.startsWith("+84")) s = "0" + s.slice(3);
  else if (s.startsWith("84") && s.length === 11) s = "0" + s.slice(2);
  return s || null;
}

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => normalizePhone(v) ?? "")
  .refine((v) => v === "" || /^0\d{9,10}$/.test(v), "Số điện thoại không hợp lệ (vd: 0901234567)");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), "Email không hợp lệ");

export const optionalText = (max = 500) => z.string().trim().max(max).optional().nullable();
export const money = z.coerce.number().int().min(0).max(1e13);

/** Màu HEX (#rgb / #rrggbb) — chặn chèn CSS qua màu thương hiệu */
export const hexColor = z
  .string()
  .trim()
  .refine((v) => v === "" || /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v), "Màu phải ở dạng #RRGGBB");

/** URL ảnh: chỉ https (chặn javascript:, data:, http) */
export const httpsUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => {
    if (v === "") return true;
    try {
      const u = new URL(v);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Đường dẫn ảnh phải bắt đầu bằng https://");
