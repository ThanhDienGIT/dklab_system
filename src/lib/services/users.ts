import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { ApiError, type AuthContext } from "../api";
import { db, schema } from "../db";
import { parsePermission, permissionScope, type Scope } from "@/modules/registry";

const RANK: Record<Scope, number> = { own: 1, branch: 2, tenant: 3 };

/**
 * Người không phải Chủ chỉ được trao những quyền mà chính mình đang có (cùng hoặc hẹp hơn phạm vi).
 * Chặn leo thang: người có users.manage tự tạo vai trò có settings.manage, gán vai trò Chủ…
 */
export function canGrant(actorPerms: string[], perms: string[]): boolean {
  if (actorPerms.includes("*")) return true;
  if (perms.includes("*")) return false;
  return perms.every((p) => {
    const { key, scope } = parsePermission(p);
    const mine = permissionScope(actorPerms, key);
    return !!mine && RANK[mine] >= RANK[scope];
  });
}

export async function assertRolesInTenant(tid: string, roleIds: string[]) {
  if (!roleIds.length) return [];
  const found = await db
    .select({ id: schema.roles.id, permissions: schema.roles.permissions })
    .from(schema.roles)
    .where(and(eq(schema.roles.tenantId, tid), inArray(schema.roles.id, roleIds)));
  if (found.length !== new Set(roleIds).size) throw new ApiError(422, "Vai trò không hợp lệ");
  return found;
}

/** Gán các vai trò này có vượt quyền người thao tác không */
export async function assertCanAssignRoles(ctx: AuthContext, roleIds: string[]) {
  const roles = await assertRolesInTenant(ctx.tid, roleIds);
  if (!roles.every((r) => canGrant(ctx.perms, r.permissions)))
    throw new ApiError(403, "Bạn không thể gán vai trò có quyền cao hơn quyền của mình");
}

/** Người thao tác chỉ quản lý được tài khoản có quyền không vượt mình (không ai ngoài Chủ đụng được Chủ) */
export async function assertCanManageUser(ctx: AuthContext, userId: string) {
  if (ctx.isOwner) return;
  const rows = await db
    .select({ permissions: schema.roles.permissions })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
    .where(eq(schema.userRoles.userId, userId));
  const perms = rows.flatMap((r) => r.permissions);
  if (!canGrant(ctx.perms, perms)) throw new ApiError(403, "Bạn không thể chỉnh sửa tài khoản có quyền cao hơn mình");
}
