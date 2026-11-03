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
