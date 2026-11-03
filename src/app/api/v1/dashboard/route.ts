import { and, desc, eq, gte, sql } from "drizzle-orm";
import { ok, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";

export const GET = withAuth("dashboard.view", async (_req, ctx) => {
  const B = schema.bookingRequests;
  const I = schema.invoices;
  // Truyền chuỗi ISO (không truyền Date) vào sql`` thô để driver postgres mã hóa đúng
  const since = sql`${new Date(Date.now() - 30 * 86400_000).toISOString()}::timestamptz`;
  const [[bk], [inv], [cust], recent, daily] = await Promise.all([
    db
      .select({
        newCount: sql<number>`count(*) filter (where ${B.status} = 'new')::int`,
        contacted: sql<number>`count(*) filter (where ${B.status} = 'contacted')::int`,
        confirmed30: sql<number>`count(*) filter (where ${B.status} in ('confirmed','completed') and ${B.createdAt} >= ${since})::int`,
        total30: sql<number>`count(*) filter (where ${B.createdAt} >= ${since})::int`,
      })
      .from(B)
      .where(eq(B.tenantId, ctx.tid)),
    db
      .select({
        revenue30: sql<number>`coalesce(sum(${I.paidAmount}) filter (where ${I.createdAt} >= ${since}),0)::bigint`,
        receivable: sql<number>`coalesce(sum(${I.total} - ${I.paidAmount}) filter (where ${I.status} = 'issued'),0)::bigint`,
        unpaidCount: sql<number>`count(*) filter (where ${I.status} = 'issued')::int`,
      })
      .from(I)
      .where(eq(I.tenantId, ctx.tid)),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.customers).where(eq(schema.customers.tenantId, ctx.tid)),
    db
      .select({ id: B.id, code: B.code, fullName: B.fullName, phone: B.phone, resourceLabel: B.resourceLabel, status: B.status, createdAt: B.createdAt })
      .from(B)
      .where(eq(B.tenantId, ctx.tid))
      .orderBy(desc(B.createdAt))
      .limit(8),
    db
      .select({ day: sql<string>`to_char(date_trunc('day', ${B.createdAt}), 'YYYY-MM-DD')`, n: sql<number>`count(*)::int` })
      .from(B)
      .where(and(eq(B.tenantId, ctx.tid), gte(B.createdAt, new Date(Date.now() - 14 * 86400_000))))
      .groupBy(sql`1`)
      .orderBy(sql`1`),
  ]);
  return ok({
    bookings: bk,
    invoices: { ...inv, revenue30: Number(inv.revenue30), receivable: Number(inv.receivable) },
    customers: cust.n,
    recent,
    daily,
  });
});
