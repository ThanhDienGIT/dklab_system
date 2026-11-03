import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";

const Body = z.object({ reason: z.string().trim().min(3, "Nhập lý do hủy").max(500) });

export const POST = withAuth<{ id: string }>("invoice.cancel", async (req, ctx, { id }) => {
  const b = await parseBody(req, Body);
  const I = schema.invoices;
  const [inv] = await db.select().from(I).where(and(eq(I.id, id), eq(I.tenantId, ctx.tid)));
  if (!inv) throw new ApiError(404, "Không tìm thấy hóa đơn");
  if (inv.paidAmount > 0) throw new ApiError(422, "Hóa đơn đã thu tiền, cần hoàn tiền trước khi hủy");
  if (inv.einvoiceStatus === "published") throw new ApiError(422, "HĐĐT đã phát hành: phải lập hóa đơn điều chỉnh/thay thế trên MISA theo NĐ 123/2020 & NĐ 70/2025");
  const [row] = await db.update(I).set({ status: "cancelled", note: [inv.note, `Hủy: ${b.reason}`].filter(Boolean).join("\n") }).where(eq(I.id, id)).returning();
  await audit(ctx, "invoice.cancel", "invoice", id, b);
  return ok(row);
});
