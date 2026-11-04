import { gte, sql } from "drizzle-orm";
import { ok } from "@/lib/api";
import { withPlatform } from "@/lib/auth/platform";
import { db, schema } from "@/lib/db";

export const GET = withPlatform(async () => {
  const since = new Date(Date.now() - 30 * 86400_000);
  const [[t], [b], [i], [u], byIndustry] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int`, active: sql<number>`count(*) filter (where status = 'active')::int`, new30: sql<number>`count(*) filter (where created_at >= ${since.toISOString()}::timestamptz)::int` }).from(schema.tenants),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.bookingRequests).where(gte(schema.bookingRequests.createdAt, since)),
    db.select({ paid: sql<number>`coalesce(sum(paid_amount),0)::bigint` }).from(schema.invoices).where(gte(schema.invoices.createdAt, since)),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.users),
    db.select({ industry: schema.tenants.industry, n: sql<number>`count(*)::int` }).from(schema.tenants).groupBy(schema.tenants.industry),
  ]);
  return ok({ tenants: t, bookings30: b.n, revenue30: Number(i.paid), users: u.n, byIndustry });
});
