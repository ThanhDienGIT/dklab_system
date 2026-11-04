import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, parseBody } from "@/lib/api";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/auth/password";
import { invalidatePlatformCache, platformAudit, setPlatformCookies, signPlatformToken, withPlatform } from "@/lib/auth/platform";
import { db, schema } from "@/lib/db";

const Body = z.object({ current: z.string().min(1), next: z.string().min(1) });

/** Đổi mật khẩu Super Admin => mọi phiên cũ hết hiệu lực, cấp lại phiên cho trình duyệt hiện tại */
export const POST = withPlatform(async (req, ctx) => {
  const b = await parseBody(req, Body);
  const weak = validatePasswordStrength(b.next);
  if (weak) throw new ApiError(422, weak);
  if (b.next.length < 10) throw new ApiError(422, "Mật khẩu quản trị nền tảng tối thiểu 10 ký tự");
  const A = schema.platformAdmins;
  const [a] = await db.select().from(A).where(eq(A.id, ctx.sub));
  if (!(await verifyPassword(a.passwordHash, b.current))) throw new ApiError(422, "Mật khẩu hiện tại không đúng");
  const [u] = await db.update(A).set({ passwordHash: await hashPassword(b.next), tokenVersion: sql`${A.tokenVersion} + 1` }).where(eq(A.id, ctx.sub)).returning();
  invalidatePlatformCache();
  await platformAudit(ctx, "auth.password_change");
  const res = NextResponse.json({ ok: true, data: { changed: true } });
  setPlatformCookies(res, await signPlatformToken({ sub: u.id, tv: u.tokenVersion, name: u.fullName, username: u.username }));
  return res;
});
