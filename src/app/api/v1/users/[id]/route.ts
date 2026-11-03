import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ApiError, audit, invalidateAuthCache, ok, parseBody, withAuth } from "@/lib/api";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { revokeAllSessions } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { assertCanAssignRoles, assertCanManageUser } from "@/lib/services/users";

const U = schema.users;
const Patch = z.object({
  fullName: z.string().trim().min(2).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  roleIds: z.array(z.uuid()).min(1, "Chọn ít nhất 1 vai trò").optional(),
  password: z.string().optional(),
});

export const PATCH = withAuth<{ id: string }>("users.manage", async (req, ctx, { id }) => {
  const b = await parseBody(req, Patch);
  const [u] = await db.select({ id: U.id }).from(U).where(and(eq(U.id, id), eq(U.tenantId, ctx.tid)));
  if (!u) throw new ApiError(404, "Không tìm thấy tài khoản");
  if (id === ctx.sub && (b.status === "disabled" || b.roleIds)) throw new ApiError(422, "Không thể tự khóa hoặc tự đổi vai trò của chính mình");
  await assertCanManageUser(ctx, id);
  if (b.roleIds) await assertCanAssignRoles(ctx, b.roleIds);
  let passwordHash: string | undefined;
  if (b.password) {
    const weak = validatePasswordStrength(b.password);
    if (weak) throw new ApiError(422, weak);
    passwordHash = await hashPassword(b.password);
  }
  await db.transaction(async (tx) => {
    await tx
      .update(U)
      .set({
        ...(b.fullName ? { fullName: b.fullName } : {}),
        ...(b.status ? { status: b.status } : {}),
        ...(passwordHash ? { passwordHash, failedLogins: 0, lockedUntil: null } : {}),
        tokenVersion: sql`${U.tokenVersion} + 1`,
      })
      .where(eq(U.id, id));
    if (b.roleIds) {
      await tx.delete(schema.userRoles).where(eq(schema.userRoles.userId, id));
      await tx.insert(schema.userRoles).values(b.roleIds.map((roleId) => ({ userId: id, roleId })));
    }
  });
  // Khóa tài khoản / đặt lại mật khẩu: đăng xuất khỏi mọi thiết bị.
  // Đổi vai trò: quyền mới áp dụng ở lần refresh token kế tiếp (tối đa 15 phút).
  if (b.status === "disabled" || passwordHash) await revokeAllSessions(id);
  invalidateAuthCache(); // tokenVersion đã tăng => token cũ bị từ chối ngay

  await audit(ctx, "user.update", "user", id, { status: b.status, roleIds: b.roleIds, passwordReset: !!passwordHash });
  return ok({ id });
});
