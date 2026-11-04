import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ApiError, invalidateAuthCache, ok, parseBody } from "@/lib/api";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { platformAudit, withPlatform } from "@/lib/auth/platform";
import { revokeAllSessions } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";

const Body = z.object({ userId: z.uuid(), password: z.string().min(1) });

/** Đặt lại mật khẩu một tài khoản của doanh nghiệp (thường là Chủ quên mật khẩu) */
export const POST = withPlatform<{ id: string }>(async (req, ctx, { id }) => {
  const b = await parseBody(req, Body);
  const weak = validatePasswordStrength(b.password);
  if (weak) throw new ApiError(422, weak);
  const U = schema.users;
  const [u] = await db
    .update(U)
    .set({ passwordHash: await hashPassword(b.password), failedLogins: 0, lockedUntil: null, tokenVersion: sql`${U.tokenVersion} + 1` })
    .where(and(eq(U.id, b.userId), eq(U.tenantId, id)))
    .returning({ id: U.id, email: U.email });
  if (!u) throw new ApiError(404, "Không tìm thấy tài khoản trong doanh nghiệp này");
  await revokeAllSessions(u.id);
  invalidateAuthCache();
  await platformAudit(ctx, "tenant.reset_password", id, { userId: u.id, email: u.email });
  return ok({ id: u.id });
});
