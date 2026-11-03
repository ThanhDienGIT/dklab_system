import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "../db";
import { buildVietQR, findBank } from "../payments/vietqr";

export type ItemInput = { itemCode?: string | null; itemName: string; unit: string; quantity: number; unitPrice: number; vatRate: number };

/** Tính tiền từng dòng + tổng. Thuế GTGT làm tròn theo dòng (VND). vatRate<0: KCT/KKKNT => 0 thuế. */
export function computeInvoice(items: ItemInput[]) {
  const lines = items.map((it, i) => {
    const amount = Math.round(it.quantity * it.unitPrice);
    const vatAmount = it.vatRate > 0 ? Math.round((amount * it.vatRate) / 100) : 0;
    return { ...it, lineNo: i + 1, amount, vatAmount };
  });
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const vatAmount = lines.reduce((s, l) => s + l.vatAmount, 0);
  return { lines, subtotal, vatAmount, discount: 0, total: subtotal + vatAmount };
}

export async function loadInvoice(where: { id?: string; publicToken?: string; tenantId?: string }) {
  const I = schema.invoices;
  const conds = [
    where.id ? eq(I.id, where.id) : undefined,
    where.publicToken ? eq(I.publicToken, where.publicToken) : undefined,
    where.tenantId ? eq(I.tenantId, where.tenantId) : undefined,
  ].filter(Boolean);
  const [row] = await db
    .select({ inv: I, tenant: { id: schema.tenants.id, name: schema.tenants.name, slug: schema.tenants.slug, settings: schema.tenants.settings } })
    .from(I)
    .innerJoin(schema.tenants, eq(schema.tenants.id, I.tenantId))
    .where(and(...conds));
  if (!row) return null;
  const [items, payments] = await Promise.all([
    db.select().from(schema.invoiceItems).where(eq(schema.invoiceItems.invoiceId, row.inv.id)).orderBy(asc(schema.invoiceItems.lineNo)),
    db.select().from(schema.payments).where(eq(schema.payments.invoiceId, row.inv.id)).orderBy(asc(schema.payments.paidAt)),
  ]);
  const s = row.tenant.settings;
  const accounts = s.bankAccounts ?? [];
  const bank = accounts.find((a) => a.id === row.inv.bankAccountId) ?? accounts.find((a) => a.isDefault) ?? accounts[0] ?? null;
  const due = Math.max(0, row.inv.total - row.inv.paidAmount);
  let qr: string | null = null;
  if (bank && due > 0 && row.inv.status !== "cancelled") {
    try {
      qr = buildVietQR({ bankBin: bank.bankBin, accountNumber: bank.accountNumber, amount: due, description: row.inv.paymentRef });
    } catch {
      qr = null;
    }
  }
  const { misa: _omit, ...publicSettings } = s; // không lộ cấu hình MISA
  return {
    ...row.inv,
    items,
    payments,
    due,
    tenant: { id: row.tenant.id, name: row.tenant.name, slug: row.tenant.slug, settings: publicSettings },
    bank: bank ? { ...bank, bankShort: findBank(bank.bankBin)?.short ?? bank.bankName } : null,
    qrPayload: qr,
  };
}
export type InvoiceFull = NonNullable<Awaited<ReturnType<typeof loadInvoice>>>;
