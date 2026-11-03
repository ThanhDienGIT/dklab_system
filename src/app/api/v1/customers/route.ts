import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { CustomerBody } from "@/lib/schemas";

const C = schema.customers;

export const GET = withAuth("customer.view", async (req, ctx) => {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
  const size = 30;
  const where: SQL[] = [eq(C.tenantId, ctx.tid)];
  if (q) where.push(or(ilike(C.fullName, `%${q}%`), ilike(C.phone, `%${q}%`), ilike(C.email, `%${q}%`))!);
  const [items, [{ total }]] = await Promise.all([
    db.select().from(C).where(and(...where)).orderBy(desc(C.createdAt)).limit(size).offset((page - 1) * size),
    db.select({ total: sql<number>`count(*)::int` }).from(C).where(and(...where)),
  ]);
  return ok({ items, total, page, size });
});


export const POST = withAuth("customer.manage", async (req, ctx) => {
  const b = await parseBody(req, CustomerBody);
  if (b.phone) {
    const [dup] = await db.select({ id: C.id }).from(C).where(and(eq(C.tenantId, ctx.tid), eq(C.phone, b.phone)));
    if (dup) throw new ApiError(409, "Số điện thoại đã tồn tại trong danh sách khách hàng");
  }
  const [row] = await db.insert(C).values({ ...b, phone: b.phone || null, email: b.email || null, tenantId: ctx.tid, source: b.source ?? "manual" }).returning();
  await audit(ctx, "customer.create", "customer", row.id);
  return ok(row);
});
