import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, clientIp, fail, parseBody } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { setPlatformCookies, signPlatformToken } from "@/lib/auth/platform";
import { db, schema } from "@/lib/db";
import { rateLimit, resetLimit } from "@/lib/ratelimit";

const Body = z.object({ username: z.string().trim().toLowerCase().min(1, "Nhập tài khoản").max(60), password: z.string().min(1, "Nhập mật khẩu").max(200) });
let dummy: Promise<string> | null = null;

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!(await rateLimit(`plogin:ip:${ip}`, 10, 900)).ok) throw new ApiError(429, "Thử quá nhiều lần, vui lòng đợi 15 phút");
    const b = await parseBody(req, Body);
    const A = schema.platformAdmins;
    const [a] = await db.select().from(A).where(eq(A.username, b.username));
    const bad = new ApiError(401, "Sai tài khoản hoặc mật khẩu");
    if (!a) {
      await verifyPassword(await (dummy ??= hashPassword("dummy-platform")), b.password);
      throw bad;
    }
    if (a.lockedUntil && a.lockedUntil > new Date()) throw new ApiError(429, "Tài khoản tạm khóa do sai nhiều lần, thử lại sau 15 phút");
    if (!(await verifyPassword(a.passwordHash, b.password))) {
      const n = a.failedLogins + 1;
      await db.update(A).set({ failedLogins: n >= 5 ? 0 : n, lockedUntil: n >= 5 ? new Date(Date.now() + 15 * 60_000) : null }).where(eq(A.id, a.id));
      await db.insert(schema.platformAuditLogs).values({ adminId: a.id, action: "auth.login_failed", ip });
      throw bad;
    }
    await db.update(A).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(A.id, a.id));
    await db.insert(schema.platformAuditLogs).values({ adminId: a.id, action: "auth.login", ip });
    await resetLimit(`plogin:ip:${ip}`);
    const token = await signPlatformToken({ sub: a.id, tv: a.tokenVersion, name: a.fullName, username: a.username });
    const res = NextResponse.json({ ok: true, data: { name: a.fullName, username: a.username } });
    setPlatformCookies(res, token);
    return res;
  } catch (e) {
    return fail(e);
  }
}
