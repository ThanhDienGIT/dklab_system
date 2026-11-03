import "server-only";
import { hash, verify } from "@node-rs/argon2";

// argon2id với tham số khuyến nghị OWASP (19 MiB, 2 vòng)
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (plain: string) => hash(plain, OPTS);
export async function verifyPassword(hashed: string, plain: string) {
  try {
    return await verify(hashed, plain);
  } catch {
    return false;
  }
}

/** Mật khẩu tối thiểu 8 ký tự, có chữ và số. */
export function validatePasswordStrength(p: string): string | null {
  if (p.length < 8) return "Mật khẩu tối thiểu 8 ký tự";
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return "Mật khẩu phải có cả chữ và số";
  return null;
}
