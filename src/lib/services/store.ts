import "server-only";
import { randomInt } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { buildVietQR, findBank } from "../payments/vietqr";
import { invalidateEntitlements } from "./entitlements";

/** Tài khoản nhận tiền của NỀN TẢNG (bán gói / plugin) — cấu hình qua biến môi trường */
export function platformBank() {
  const bankBin = process.env.PLATFORM_BANK_BIN || "970436";
  return {
    bankBin,
    bankName: findBank(bankBin)?.short ?? bankBin,
    accountNumber: process.env.PLATFORM_BANK_ACCOUNT || "0123456789",
    accountName: process.env.PLATFORM_BANK_NAME || "CONG TY DKLAB",
  };
}

export function orderQR(amount: number, code: string) {
  const b = platformBank();
  return amount > 0 ? buildVietQR({ bankBin: b.bankBin, accountNumber: b.accountNumber, amount, description: code }) : null;
}

const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const orderCode = () => `DK${Array.from({ length: 7 }, () => A[randomInt(A.length)]).join("")}`;

const DAY = 86400_000;
/** Cộng theo tháng dương lịch (mua 12 tháng = đúng 1 năm) */
function addMonths(ms: number, months: number) {
  const d = new Date(ms);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0); // 31/01 + 1 tháng => 28-29/02
  return d;
}

/** Kích hoạt plugin / gói sau khi đã nhận tiền (hoặc dùng thử). Gia hạn cộng dồn nếu còn hạn. */
export async function activate(tx: Pick<typeof db, "select" | "insert" | "update">, o: { tenantId: string; kind: string; target: string; months: number }, trialDays?: number) {
  const now = Date.now();
  if (o.kind === "plan") {
    const [t] = await tx.select({ plan: schema.tenants.plan, exp: schema.tenants.planExpiresAt }).from(schema.tenants).where(eq(schema.tenants.id, o.tenantId));
    const base = t?.plan === o.target && t.exp && t.exp.getTime() > now ? t.exp.getTime() : now;
    await tx.update(schema.tenants).set({ plan: o.target, planExpiresAt: addMonths(base, o.months) }).where(eq(schema.tenants.id, o.tenantId));
  } else {
    const M = schema.tenantModules;
    const [cur] = await tx.select().from(M).where(and(eq(M.tenantId, o.tenantId), eq(M.moduleKey, o.target)));
    const base = cur?.expiresAt && cur.expiresAt.getTime() > now ? cur.expiresAt.getTime() : now;
    const expiresAt = trialDays ? new Date(base + trialDays * DAY) : addMonths(base, o.months);
    // Module đã có vĩnh viễn (theo ngành / cấp tay) thì không đổi
    if (cur && !cur.expiresAt && cur.enabled) return;
    await tx
      .insert(M)
      .values({ tenantId: o.tenantId, moduleKey: o.target, enabled: true, source: trialDays ? "trial" : "addon", expiresAt })
      .onConflictDoUpdate({ target: [M.tenantId, M.moduleKey], set: { enabled: true, source: sql`excluded.source`, expiresAt: sql`excluded.expires_at` } });
  }
  invalidateEntitlements(o.tenantId);
}
