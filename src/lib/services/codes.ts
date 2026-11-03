import "server-only";
import { randomInt } from "node:crypto";

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ ký tự dễ nhầm O/0, I/1

export function shortCode(prefix: string, len = 4) {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  let r = "";
  for (let i = 0; i < len; i++) r += ALPHA[randomInt(ALPHA.length)];
  return `${prefix}${ymd}-${r}`;
}
