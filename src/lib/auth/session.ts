import "server-only";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import type { NextResponse } from "next/server";
import { db, schema } from "../db";
import { randomToken, sha256 } from "../crypto";
import {
  ACCESS_COOKIE,
  ACCESS_TTL_SEC,
  REFRESH_COOKIE,
  REFRESH_TTL_SEC,
  signAccessToken,
  type AccessClaims,
} from "./jwt";
import { hashPassword, verifyPassword } from "./password";

let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("dummy-password-for-timing"));
import { ApiError } from "../api";

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
/** Trong khoảng này, refresh token cũ bị gửi lại (vd: 2 tab cùng refresh) không bị coi là tấn công. */
const ROTATION_GRACE_MS = 30_000;

async function loadAccess(userId: string) {
  const rows = await db
    .select({ key: schema.roles.key, permissions: schema.roles.permissions })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
    .where(eq(schema.userRoles.userId, userId));
  return {
    roles: rows.map((r) => r.key),
    perms: [...new Set(rows.flatMap((r) => r.permissions))],
  };
}

type TokenPair = { accessToken: string; refreshToken: string; claims: AccessClaims };

async function issue(
  user: { id: string; fullName: string; tokenVersion: number },
  tenant: { id: string; slug: string },
  sessionId: string,
  refreshToken: string,
): Promise<TokenPair> {
  const access = await loadAccess(user.id);
  const claims: AccessClaims = {
    sub: user.id,
    tid: tenant.id,
    ts: tenant.slug,
    sid: sessionId,
    tv: user.tokenVersion,
    name: user.fullName,
    ...access,
  };
  return { accessToken: await signAccessToken(claims), refreshToken, claims };
}

export async function login(opts: {
  tenant: { id: string; slug: string };
  identifier: string;
  password: string;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<TokenPair> {
  const id = opts.identifier.trim().toLowerCase();
  const [user] = await db
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.tenantId, opts.tenant.id),
        or(eq(schema.users.email, id), eq(schema.users.phone, id.replace(/\s/g, ""))),
      ),
    )
    .limit(1);

  const invalid = new ApiError(401, "Sai tài khoản hoặc mật khẩu");
  if (!user) {
    await verifyPassword(await getDummyHash(), opts.password); // cân bằng thời gian, chống dò tài khoản tồn tại
    throw invalid;
  }
  if (user.status !== "active") throw new ApiError(403, "Tài khoản đã bị khóa");
  if (user.lockedUntil && user.lockedUntil > new Date())
    throw new ApiError(429, `Đăng nhập sai quá nhiều lần. Thử lại sau ${LOCK_MINUTES} phút`);

  if (!(await verifyPassword(user.passwordHash, opts.password))) {
    const failed = user.failedLogins + 1;
    await db
      .update(schema.users)
      .set({
        failedLogins: failed >= MAX_FAILED ? 0 : failed,
        lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      })
      .where(eq(schema.users.id, user.id));
    throw invalid;
  }

  await db
    .update(schema.users)
    .set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(schema.users.id, user.id));

  const refreshToken = randomToken();
  const [session] = await db
    .insert(schema.sessions)
    .values({
      tenantId: opts.tenant.id,
      userId: user.id,
      refreshHash: sha256(refreshToken),
      userAgent: opts.userAgent?.slice(0, 300),
      ip: opts.ip,
      expiresAt: new Date(Date.now() + REFRESH_TTL_SEC * 1000),
    })
    .returning({ id: schema.sessions.id });

  return issue(user, opts.tenant, session.id, refreshToken);
}

export type RefreshResult = { kind: "ok"; tokens: TokenPair } | { kind: "stale" } | { kind: "invalid" };

/** Xoay vòng refresh token: mỗi lần refresh cấp token mới, token cũ hết hiệu lực. */
export async function refresh(refreshToken: string): Promise<RefreshResult> {
  const hash = sha256(refreshToken);
  const now = new Date();
  const [s] = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.refreshHash, hash), isNull(schema.sessions.revokedAt), gt(schema.sessions.expiresAt, now)))
    .limit(1);

  if (!s) {
    // Token cũ bị dùng lại?
    const [reused] = await db.select().from(schema.sessions).where(eq(schema.sessions.previousHash, hash)).limit(1);
    if (reused && !reused.revokedAt) {
      if (now.getTime() - reused.lastUsedAt.getTime() < ROTATION_GRACE_MS) return { kind: "stale" };
      // Ngoài thời gian ân hạn => nghi bị đánh cắp: thu hồi cả phiên
      await db.update(schema.sessions).set({ revokedAt: now }).where(eq(schema.sessions.id, reused.id));
    }
    return { kind: "invalid" };
  }

  const [row] = await db
    .select({ user: schema.users, tenant: { id: schema.tenants.id, slug: schema.tenants.slug, status: schema.tenants.status } })
    .from(schema.users)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.users.tenantId))
    .where(eq(schema.users.id, s.userId))
    .limit(1);
  if (!row || row.user.status !== "active" || row.tenant.status !== "active") {
    await db.update(schema.sessions).set({ revokedAt: now }).where(eq(schema.sessions.id, s.id));
    return { kind: "invalid" };
  }

  const next = randomToken();
  const updated = await db
    .update(schema.sessions)
    .set({ refreshHash: sha256(next), previousHash: hash, lastUsedAt: now })
    .where(and(eq(schema.sessions.id, s.id), eq(schema.sessions.refreshHash, hash)))
    .returning({ id: schema.sessions.id });
  if (updated.length === 0) return { kind: "stale" }; // request song song đã xoay trước

  return { kind: "ok", tokens: await issue(row.user, row.tenant, s.id, next) };
}

export async function revokeByRefresh(refreshToken: string) {
  await db
    .update(schema.sessions)
    .set({ revokedAt: new Date() })
    .where(eq(schema.sessions.refreshHash, sha256(refreshToken)));
}

/** Thu hồi mọi phiên của user (đổi mật khẩu, khóa tài khoản, đổi quyền). */
export async function revokeAllSessions(userId: string) {
  await db.update(schema.sessions).set({ revokedAt: new Date() }).where(and(eq(schema.sessions.userId, userId), isNull(schema.sessions.revokedAt)));
}

const secure = process.env.NODE_ENV === "production";

export function setAuthCookies(res: NextResponse, t: { accessToken: string; refreshToken: string }) {
  res.cookies.set(ACCESS_COOKIE, t.accessToken, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: ACCESS_TTL_SEC });
  // Refresh token chỉ gửi tới /api/auth để giảm bề mặt lộ token
  res.cookies.set(REFRESH_COOKIE, t.refreshToken, { httpOnly: true, secure, sameSite: "strict", path: "/api/auth", maxAge: REFRESH_TTL_SEC });
  // Cookie không nhạy cảm để proxy biết user đã đăng nhập (proxy không thấy cookie path=/api/auth)
  res.cookies.set("dk_li", "1", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: REFRESH_TTL_SEC });
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { path: "/api/auth", maxAge: 0 });
  res.cookies.set("dk_li", "", { path: "/", maxAge: 0 });
}
