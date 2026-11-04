import { and, eq, isNull, ne, or } from "drizzle-orm";
import { z } from "zod";
import { audit, ok, parseBody, withAuth } from "@/lib/api";
import { randomToken } from "@/lib/crypto";
import { db, schema } from "@/lib/db";
import { toTransferText } from "@/lib/payments/vietqr";
import { shortCode } from "@/lib/services/codes";
import { computeInvoice } from "@/lib/services/invoices";

/** Lập hóa đơn phí dịch vụ tháng cho mọi hợp đồng đang hiệu lực chưa lập kỳ này. */
const Body = z.object({ period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Kỳ phải dạng YYYY-MM") });

export const POST = withAuth("contract.manage", async (req, ctx) => {
  const { period } = await parseBody(req, Body);
  const C = schema.contracts;
  const [tenant] = await db.select({ slug: schema.tenants.slug, settings: schema.tenants.settings }).from(schema.tenants).where(eq(schema.tenants.id, ctx.tid));
  const vat = tenant.settings.invoice?.defaultVatRate ?? 8;
  const prefix = tenant.settings.invoice?.prefix || "HD";
  const list = await db
    .select({ c: C, cust: schema.customers })
    .from(C)
    .innerJoin(schema.customers, eq(schema.customers.id, C.customerId))
    .where(and(eq(C.tenantId, ctx.tid), eq(C.status, "active"), or(isNull(C.lastBilledPeriod), ne(C.lastBilledPeriod, period))));
  const [y, m] = period.split("-");
  const created: string[] = [];
  for (const { c, cust } of list) {
    if (c.monthlyFee <= 0 || c.startDate.slice(0, 7) > period || (c.endDate && c.endDate.slice(0, 7) < period)) continue;
    const calc = computeInvoice([{ itemName: `${c.title} – tháng ${m}/${y}`, unit: "Tháng", quantity: 1, unitPrice: c.monthlyFee, vatRate: vat }]);
    const code = shortCode(prefix);
    await db.transaction(async (tx) => {
      const [inv] = await tx
        .insert(schema.invoices)
        .values({
          tenantId: ctx.tid, code, customerId: cust.id, buyerName: cust.fullName, buyerLegalName: cust.fullName, buyerTaxCode: cust.taxCode,
          buyerAddress: cust.address, buyerEmail: cust.email, buyerPhone: cust.phone, issueDate: new Date().toISOString().slice(0, 10),
          status: "issued", subtotal: calc.subtotal, vatAmount: calc.vatAmount, total: calc.total,
          paymentRef: toTransferText(`${code.replace("-", "")} ${tenant.slug.replace(/_/g, "")}`, 25), publicToken: randomToken(18),
          note: `Hợp đồng ${c.code} – kỳ ${m}/${y}`, createdBy: ctx.sub,
        })
        .returning({ id: schema.invoices.id });
      await tx.insert(schema.invoiceItems).values(calc.lines.map((l) => ({ ...l, invoiceId: inv.id })));
      await tx.update(C).set({ lastBilledPeriod: period }).where(eq(C.id, c.id));
    });
    created.push(code);
  }
  await audit(ctx, "contract.bill", "contract", null, { period, created: created.length });
  return ok({ period, created });
});
