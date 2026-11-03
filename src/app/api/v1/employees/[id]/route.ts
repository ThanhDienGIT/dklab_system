import { and, eq } from "drizzle-orm";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { assertOwned } from "@/lib/services/guard";
import { EmployeeBody } from "@/lib/schemas";

const E = schema.employees;

export const PATCH = withAuth<{ id: string }>("employee.manage", async (req, ctx, { id }) => {
  const b = await parseBody(req, EmployeeBody);
  await assertOwned(schema.branches, b.branchId, ctx.tid);
  await assertOwned(schema.users, b.userId, ctx.tid);
  const [row] = await db.update(E).set({ ...b, phone: b.phone || null, email: b.email || null }).where(and(eq(E.id, id), eq(E.tenantId, ctx.tid))).returning();
  if (!row) throw new ApiError(404, "Không tìm thấy nhân viên");
  await audit(ctx, "employee.update", "employee", id);
  return ok(row);
});

export const DELETE = withAuth<{ id: string }>("employee.manage", async (_req, ctx, { id }) => {
  await db.delete(E).where(and(eq(E.id, id), eq(E.tenantId, ctx.tid)));
  await audit(ctx, "employee.delete", "employee", id);
  return ok({ id });
});
