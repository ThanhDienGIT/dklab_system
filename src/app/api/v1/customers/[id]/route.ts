import { and, desc, eq } from "drizzle-orm";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { CustomerBody } from "@/lib/schemas";

const C = schema.customers;

export const GET = withAuth<{ id: string }>("customer.view", async (_req, ctx, { id }) => {
  const [c] = await db.select().from(C).where(and(eq(C.id, id), eq(C.tenantId, ctx.tid)));
  if (!c) throw new ApiError(404, "Không tìm thấy khách hàng");
  const [bookings, invoices] = await Promise.all([
    db.select().from(schema.bookingRequests).where(eq(schema.bookingRequests.customerId, id)).orderBy(desc(schema.bookingRequests.createdAt)).limit(50),
    db.select().from(schema.invoices).where(eq(schema.invoices.customerId, id)).orderBy(desc(schema.invoices.createdAt)).limit(50),
  ]);
  return ok({ ...c, bookings, invoices });
});

export const PATCH = withAuth<{ id: string }>("customer.manage", async (req, ctx, { id }) => {
  const b = await parseBody(req, CustomerBody);
  const [row] = await db
    .update(C)
    .set({ ...b, phone: b.phone || null, email: b.email || null })
    .where(and(eq(C.id, id), eq(C.tenantId, ctx.tid)))
    .returning();
  if (!row) throw new ApiError(404, "Không tìm thấy khách hàng");
  await audit(ctx, "customer.update", "customer", id);
  return ok(row);
});
