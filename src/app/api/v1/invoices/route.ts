import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { randomToken } from "@/lib/crypto";
import { db, schema } from "@/lib/db";
import { toTransferText } from "@/lib/payments/vietqr";
import { InvoiceBody } from "@/lib/schemas";
import { shortCode } from "@/lib/services/codes";
import { computeInvoice } from "@/lib/services/invoices";

const I = schema.invoices;

export const GET = withAuth("invoice.view", async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const q = sp.get("q")?.trim();
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const size = 30;
  const where: SQL[] = [eq(I.tenantId, ctx.tid)];
  if (status && status !== "all") where.push(eq(I.status, status));
  if (q) where.push(or(ilike(I.code, `%${q}%`), ilike(I.buyerName, `%${q}%`), ilike(I.buyerPhone, `%${q}%`))!);
  const [items, [{ total }]] = await Promise.all([
    db.select().from(I).where(and(...where)).orderBy(desc(I.createdAt)).limit(size).offset((page - 1) * size),
    db.select({ total: sql<number>`count(*)::int` }).from(I).where(and(...where)),
  ]);
  return ok({ items, total, page, size });
});

export const POST = withAuth("invoice.create", async (req, ctx) => {
  const b = await parseBody(req, InvoiceBody);
  const [tenant] = await db.select({ settings: schema.tenants.settings, slug: schema.tenants.slug }).from(schema.tenants).where(eq(schema.tenants.id, ctx.tid));
  const calc = computeInvoice(b.items);
  const prefix = tenant.settings.invoice?.prefix || "HD";

  let customerId = b.customerId ?? null;
  if (b.bookingId) {
    const [bk] = await db.select().from(schema.bookingRequests).where(and(eq(schema.bookingRequests.id, b.bookingId), eq(schema.bookingRequests.tenantId, ctx.tid)));
    if (!bk) throw new ApiError(404, "Không tìm thấy đặt chỗ");
    customerId ??= bk.customerId;
  }

  const code = shortCode(prefix);
  const inv = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(I)
      .values({
        tenantId: ctx.tid,
        code,
        bookingId: b.bookingId ?? null,
        customerId,
        buyerName: b.buyerName,
        buyerLegalName: b.buyerLegalName ?? null,
        buyerTaxCode: b.buyerTaxCode || null,
        buyerAddress: b.buyerAddress ?? null,
        buyerEmail: b.buyerEmail || null,
        buyerPhone: b.buyerPhone || null,
        issueDate: b.issueDate ?? new Date().toISOString().slice(0, 10),
        status: "issued",
        subtotal: calc.subtotal,
        discount: 0,
        vatAmount: calc.vatAmount,
        total: calc.total,
        bankAccountId: b.bankAccountId ?? null,
        paymentRef: toTransferText(`${code.replace("-", "")} ${tenant.slug.replace(/_/g, "")}`, 25),
        publicToken: randomToken(18),
        note: b.note ?? null,
        createdBy: ctx.sub,
      })
      .returning();
    await tx.insert(schema.invoiceItems).values(calc.lines.map((l) => ({ ...l, invoiceId: row.id })));
    return row;
  });
  await audit(ctx, "invoice.create", "invoice", inv.id, { code, total: calc.total });
  return ok(inv);
});
