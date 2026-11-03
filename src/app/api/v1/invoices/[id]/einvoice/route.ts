import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { misaCreateInvoice, misaPublishInvoice } from "@/lib/einvoice/misa";

const Body = z.object({
  action: z.enum(["create", "publish"]),
  /** XML đã ký số (USB token / HSM) — bắt buộc khi publish ở môi trường test/live */
  signedXml: z.string().max(2_000_000).optional(),
});

/**
 * Đẩy hóa đơn sang MISA meInvoice:
 *  - create : tạo hóa đơn trên MISA (nhận TransactionID)
 *  - publish: phát hành (cấp số hóa đơn)
 */
export const POST = withAuth<{ id: string }>("einvoice.publish", async (req, ctx, { id }) => {
  const b = await parseBody(req, Body);
  const I = schema.invoices;
  const [row] = await db
    .select({ inv: I, settings: schema.tenants.settings, tenantName: schema.tenants.name })
    .from(I)
    .innerJoin(schema.tenants, eq(schema.tenants.id, I.tenantId))
    .where(and(eq(I.id, id), eq(I.tenantId, ctx.tid)));
  if (!row) throw new ApiError(404, "Không tìm thấy hóa đơn");
  const { inv, settings } = row;
  const cfg = settings.misa;
  if (!cfg?.enabled) throw new ApiError(422, "Chưa bật tích hợp MISA meInvoice (Cài đặt → Hóa đơn điện tử)");
  if (inv.status === "cancelled") throw new ApiError(422, "Hóa đơn đã hủy");

  const history = inv.einvoiceData?.history ?? [];
  const now = new Date().toISOString();

  if (b.action === "create") {
    if (inv.einvoiceStatus === "published") throw new ApiError(422, "Hóa đơn đã phát hành");
    const items = await db.select().from(schema.invoiceItems).where(eq(schema.invoiceItems.invoiceId, id));
    const bank = settings.bankAccounts?.find((a) => a.id === inv.bankAccountId) ?? settings.bankAccounts?.[0];
    const r = await misaCreateInvoice(cfg, {
      refId: inv.id,
      invDate: inv.issueDate,
      paymentMethod: "TM/CK",
      seller: {
        legalName: settings.company?.legalName || row.tenantName,
        taxCode: settings.company?.taxCode || cfg.taxCode || "",
        address: settings.company?.address,
        phone: settings.contact?.phone,
        email: settings.contact?.email,
        bankAccount: bank?.accountNumber,
        bankName: bank?.bankName,
      },
      buyer: { fullName: inv.buyerName, legalName: inv.buyerLegalName, taxCode: inv.buyerTaxCode, address: inv.buyerAddress, email: inv.buyerEmail, phone: inv.buyerPhone },
      lines: items,
      totals: { subtotal: inv.subtotal, discount: inv.discount, vat: inv.vatAmount, total: inv.total },
      note: inv.note,
    });
    const data = {
      ...(inv.einvoiceData ?? {}),
      provider: "misa" as const,
      env: cfg.env,
      refId: inv.id,
      transactionId: r.transactionId ?? inv.einvoiceData?.transactionId,
      invSeries: r.invSeries ?? cfg.invSeries,
      error: r.ok ? undefined : r.message,
      history: [...history, { at: now, action: "create", ok: r.ok, message: r.message }],
    };
    await db.update(I).set({ einvoiceStatus: r.ok ? "created" : "error", einvoiceData: data }).where(eq(I.id, id));
    await audit(ctx, "einvoice.create", "invoice", id, { ok: r.ok, message: r.message });
    if (!r.ok) throw new ApiError(502, `MISA: ${r.message}`);
    return ok({ status: "created", ...data, xml: r.xml });
  }

  // publish
  if (inv.einvoiceStatus !== "created") throw new ApiError(422, "Cần đẩy hóa đơn sang MISA (tạo) trước khi phát hành");
  const r = await misaPublishInvoice(cfg, {
    refId: inv.id,
    transactionId: inv.einvoiceData!.transactionId!,
    signedXml: b.signedXml,
    email: inv.buyerEmail,
    name: inv.buyerName,
  });
  const data = {
    ...inv.einvoiceData!,
    invNo: r.invNo,
    invCode: r.invCode,
    invSeries: r.invSeries ?? inv.einvoiceData?.invSeries,
    invDate: r.invDate,
    error: r.ok ? undefined : r.message,
    history: [...history, { at: now, action: "publish", ok: r.ok, message: r.message }],
  };
  await db.update(I).set({ einvoiceStatus: r.ok ? "published" : "created", einvoiceData: data }).where(eq(I.id, id));
  await audit(ctx, "einvoice.publish", "invoice", id, { ok: r.ok, message: r.message });
  if (!r.ok) throw new ApiError(502, `MISA: ${r.message}`);
  return ok({ status: "published", ...data });
});
