import { and, eq } from "drizzle-orm";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { RoleBody, validatePerms } from "@/lib/services/roles";

const R = schema.roles;

export const PATCH = withAuth<{ id: string }>("users.manage", async (req, ctx, { id }) => {
  const b = await parseBody(req, RoleBody);
  validatePerms(b.permissions);
  const [cur] = await db.select().from(R).where(and(eq(R.id, id), eq(R.tenantId, ctx.tid)));
  if (!cur) throw new ApiError(404, "Không tìm thấy vai trò");
  if (cur.key === "owner") throw new ApiError(422, "Không sửa được vai trò Chủ doanh nghiệp");
  const [row] = await db.update(R).set(b).where(eq(R.id, id)).returning();
  await audit(ctx, "role.update", "role", id, b);
  return ok(row);
});

export const DELETE = withAuth<{ id: string }>("users.manage", async (_req, ctx, { id }) => {
  const [cur] = await db.select().from(R).where(and(eq(R.id, id), eq(R.tenantId, ctx.tid)));
  if (!cur) throw new ApiError(404, "Không tìm thấy vai trò");
  if (cur.isSystem) throw new ApiError(422, "Không xóa được vai trò hệ thống");
  await db.delete(R).where(eq(R.id, id));
  await audit(ctx, "role.delete", "role", id);
  return ok({ id });
});
