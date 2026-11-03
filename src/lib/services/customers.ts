import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "../db";

/** Tìm khách theo SĐT (ưu tiên) hoặc email; chưa có thì tạo mới. */
export async function upsertCustomer(
  tx: Pick<typeof db, "select" | "insert" | "update">,
  tenantId: string,
  c: { fullName: string; phone?: string | null; email?: string | null; source?: string; consent?: boolean },
) {
  const T = schema.customers;
  let found: { id: string } | undefined;
  if (c.phone) [found] = await tx.select({ id: T.id }).from(T).where(and(eq(T.tenantId, tenantId), eq(T.phone, c.phone))).limit(1);
  if (!found && c.email) [found] = await tx.select({ id: T.id }).from(T).where(and(eq(T.tenantId, tenantId), eq(T.email, c.email))).limit(1);
  if (found) {
    await tx
      .update(T)
      .set({
        bookingCount: sql`${T.bookingCount} + 1`,
        ...(c.email ? { email: sql`coalesce(${T.email}, ${c.email})` } : {}),
        ...(c.phone ? { phone: sql`coalesce(${T.phone}, ${c.phone})` } : {}),
        ...(c.consent ? { consentAt: new Date() } : {}),
      })
      .where(eq(T.id, found.id));
    return found.id;
  }
  const [row] = await tx
    .insert(T)
    .values({ tenantId, fullName: c.fullName, phone: c.phone || null, email: c.email || null, source: c.source ?? "website", bookingCount: 1, consentAt: c.consent ? new Date() : null })
    .returning({ id: T.id });
  return row.id;
}
