import { and, eq, inArray, sql } from "drizzle-orm";
import { ApiError, audit, invalidateAuthCache, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { RoleBody, validatePerms } from "@/lib/services/roles";
import { canGrant } from "@/lib/services/users";

const R = schema.roles;

/** Quyền của vai trò thay đổi => buộc token của người giữ vai trò này cấp lại ngay */
async function bumpHolders(roleId: string) {
  const holders = db.select({ id: schema.userRoles.userId }).from(schema.userRoles).where(eq(schema.userRoles.roleId, roleId));
  await db.update(schema.users).set({ tokenVersion: sql`${schema.users.tokenVersion} + 1` }).where(inArray(schema.users.id, holders));
  invalidateAuthCache();
}

export const PATCH = withAuth<{ id: string }>("users.manage", async (req, ctx, { id }) => {
  const b = await parseBody(req, RoleBody);
  validatePerms(b.permissions);
  const [cur] = await db.select().from(R).where(and(eq(R.id, id), eq(R.tenantId, ctx.tid)));
  if (!cur) throw new ApiError(404, "Không tìm thấy vai trò");
  if (cur.key === "owner") throw new ApiError(422, "Không sửa được vai trò Chủ doanh nghiệp");
  if (!canGrant(ctx.perms, cur.permissions) || !canGrant(ctx.perms, b.permissions))
    throw new ApiError(403, "Không thể sửa vai trò có quyền vượt quyền của bạn");
  const [row] = await db.update(R).set(b).where(eq(R.id, id)).returning();
  await bumpHolders(id);
  await audit(ctx, "role.update", "role", id, b);
  return ok(row);
});

export const DELETE = withAuth<{ id: string }>("users.manage", async (_req, ctx, { id }) => {
  const [cur] = await db.select().from(R).where(and(eq(R.id, id), eq(R.tenantId, ctx.tid)));
  if (!cur) throw new ApiError(404, "Không tìm thấy vai trò");
  if (cur.isSystem) throw new ApiError(422, "Không xóa được vai trò hệ thống");
  if (!canGrant(ctx.perms, cur.permissions)) throw new ApiError(403, "Không thể xóa vai trò có quyền vượt quyền của bạn");
  await bumpHolders(id);
  await db.delete(R).where(eq(R.id, id));
  await audit(ctx, "role.delete", "role", id);
  return ok({ id });
});
