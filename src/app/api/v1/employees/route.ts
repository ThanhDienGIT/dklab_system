import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { assertOwned } from "@/lib/services/guard";
import { EmployeeBody } from "@/lib/schemas";

const E = schema.employees;

export const GET = withAuth("employee.view", async (req, ctx) => {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const where: SQL[] = [eq(E.tenantId, ctx.tid)];
  if (q) where.push(or(ilike(E.fullName, `%${q}%`), ilike(E.phone, `%${q}%`), ilike(E.code, `%${q}%`))!);
  const items = await db
    .select({ e: E, branch: schema.branches.name, account: schema.users.email })
    .from(E)
    .leftJoin(schema.branches, eq(schema.branches.id, E.branchId))
    .leftJoin(schema.users, eq(schema.users.id, E.userId))
    .where(and(...where))
    .orderBy(asc(E.code));
  const branches = await db.select({ id: schema.branches.id, name: schema.branches.name }).from(schema.branches).where(eq(schema.branches.tenantId, ctx.tid));
  return ok({ items: items.map((r) => ({ ...r.e, branchName: r.branch, accountEmail: r.account })), branches });
});


export const POST = withAuth("employee.manage", async (req, ctx) => {
  const b = await parseBody(req, EmployeeBody);
  await assertOwned(schema.branches, b.branchId, ctx.tid);
  await assertOwned(schema.users, b.userId, ctx.tid);
  const [row] = await db.insert(E).values({ ...b, phone: b.phone || null, email: b.email || null, tenantId: ctx.tid }).returning();
  await audit(ctx, "employee.create", "employee", row.id);
  return ok(row);
});
