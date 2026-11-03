import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { money, optionalText } from "@/lib/validators";

const Body = z.object({
  amount: money.refine((v) => v > 0, "Số tiền phải lớn hơn 0"),
  method: z.enum(["cash", "bank_transfer", "card"]),
  reference: optionalText(120),
});

export const POST = withAuth<{ id: string }>("invoice.payment", async (req, ctx, { id }) => {
  const b = await parseBody(req, Body);
  const I = schema.invoices;
  const result = await db.transaction(async (tx) => {
    const [inv] = await tx.select().from(I).where(and(eq(I.id, id), eq(I.tenantId, ctx.tid))).for("update");
    if (!inv) throw new ApiError(404, "Không tìm thấy hóa đơn");
    if (inv.status === "cancelled") throw new ApiError(422, "Hóa đơn đã hủy");
    const due = inv.total - inv.paidAmount;
    if (b.amount > due) throw new ApiError(422, `Số tiền vượt quá số còn phải thu (${due.toLocaleString("vi-VN")}đ)`);
    await tx.insert(schema.payments).values({ tenantId: ctx.tid, invoiceId: id, amount: b.amount, method: b.method, reference: b.reference ?? null, receivedBy: ctx.sub });
    const paid = inv.paidAmount + b.amount;
    const [row] = await tx.update(I).set({ paidAmount: paid, status: paid >= inv.total ? "paid" : inv.status }).where(eq(I.id, id)).returning();
    if (inv.customerId)
      await tx.update(schema.customers).set({ totalSpent: sql`${schema.customers.totalSpent} + ${b.amount}` }).where(eq(schema.customers.id, inv.customerId));
    return row;
  });
  await audit(ctx, "invoice.payment", "invoice", id, b);
  return ok(result);
});
