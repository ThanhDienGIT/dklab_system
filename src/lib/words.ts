/** Đọc số tiền bằng chữ tiếng Việt (dùng chung client/server). */
const D = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
function triple(n: number, full: boolean): string {
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), u = n % 10;
  const out: string[] = [];
  if (h > 0 || full) out.push(`${D[h]} trăm`);
  if (t > 1) out.push(`${D[t]} mươi`);
  else if (t === 1) out.push("mười");
  else if ((h > 0 || full) && u > 0) out.push("linh");
  if (u > 0) {
    if (u === 1 && t > 1) out.push("mốt");
    else if (u === 5 && t > 0) out.push("lăm");
    else if (u === 4 && t > 1) out.push("tư");
    else out.push(D[u]);
  }
  return out.join(" ");
}
export function amountInWordsVN(amount: number): string {
  let n = Math.round(Math.abs(amount));
  if (n === 0) return "Không đồng";
  const units = ["", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ"];
  const g: number[] = [];
  while (n > 0) { g.push(n % 1000); n = Math.floor(n / 1000); }
  const parts: string[] = [];
  for (let i = g.length - 1; i >= 0; i--) if (g[i] !== 0) parts.push(triple(g[i], i < g.length - 1) + units[i]);
  const s = parts.join(" ").trim() + " đồng";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
