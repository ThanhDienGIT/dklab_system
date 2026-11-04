/**
 * Lịch kê khai thuế (tham khảo Luật Quản lý thuế 38/2019 & NĐ 126/2020):
 *  - GTGT/TNCN kê khai tháng: hạn ngày 20 tháng sau
 *  - Kê khai quý: hạn ngày cuối tháng đầu quý sau; TNDN tạm nộp quý: cùng hạn
 *  - Quyết toán TNDN + Báo cáo tài chính năm: ngày cuối tháng 3 năm sau
 * Chỉ để nhắc việc — kế toán viên chịu trách nhiệm kiểm tra quy định hiện hành.
 */
export type TaxTask = { kind: string; period: string; dueDate: string };

export const TAX_KIND_LABEL: Record<string, string> = {
  vat: "Tờ khai thuế GTGT",
  pit: "Tờ khai thuế TNCN",
  cit_prov: "Tạm nộp thuế TNDN quý",
  cit_final: "Quyết toán thuế TNDN năm",
  fs: "Báo cáo tài chính năm",
};

const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m: 1..12
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Sinh các nghĩa vụ có hạn trong khoảng [from, to] (YYYY-MM-DD) */
export function tasksBetween(taxPeriod: "monthly" | "quarterly", from: string, to: string): TaxTask[] {
  const out: TaxTask[] = [];
  const y0 = Number(from.slice(0, 4)) - 1;
  const y1 = Number(to.slice(0, 4)) + 1;
  for (let y = y0; y <= y1; y++) {
    if (taxPeriod === "monthly") {
      for (let m = 1; m <= 12; m++) {
        const ny = m === 12 ? y + 1 : y;
        const nm = m === 12 ? 1 : m + 1;
        const due = iso(ny, nm, 20);
        const period = `${y}-${String(m).padStart(2, "0")}`;
        out.push({ kind: "vat", period, dueDate: due }, { kind: "pit", period, dueDate: due });
      }
    }
    for (let q = 1; q <= 4; q++) {
      const ny = q === 4 ? y + 1 : y;
      const nm = q === 4 ? 1 : q * 3 + 1;
      const due = iso(ny, nm, lastDay(ny, nm));
      const period = `${y}-Q${q}`;
      if (taxPeriod === "quarterly") out.push({ kind: "vat", period, dueDate: due }, { kind: "pit", period, dueDate: due });
      out.push({ kind: "cit_prov", period, dueDate: due });
    }
    out.push({ kind: "cit_final", period: String(y), dueDate: iso(y + 1, 3, 31) }, { kind: "fs", period: String(y), dueDate: iso(y + 1, 3, 31) });
  }
  return out.filter((t) => t.dueDate >= from && t.dueDate <= to);
}
