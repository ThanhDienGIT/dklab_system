import "server-only";
/**
 * Xác thực Super Admin nền tảng (/superdklab) — TÁCH BIỆT hoàn toàn với tài khoản doanh nghiệp:
 *  - Khóa ký riêng (dẫn xuất "platform:"), issuer + audience riêng => token doanh nghiệp không dùng được ở đây và ngược lại
 *  - Cookie riêng dk_pt (httpOnly, SameSite=Strict), sống 8 giờ
 *  - Mỗi request kiểm tra tokenVersion (đổi mật khẩu / đăng xuất => token cũ mất hiệu lực)
 */
import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError, clientIp, fail } from "../api";
import { db, schema } from "../db";
import { appSecret } from "../env";

export const PLATFORM_COOKIE = "dk_pt";
const TTL = 8 * 3600;
const ISS = "dklab-platform";
const AUD = "platform";
const key = () => new TextEncoder().encode(`platform:${appSecret()}`);

export type PlatformClaims = { sub: string; tv: number; name: string; username: string };

export async function signPlatformToken(c: PlatformClaims) {
  return new SignJWT({ tv: c.tv, name: c.name, username: c.username })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(c.sub)
    .setIssuer(ISS)
    .setAudience(AUD)
    .setIssuedAt()
    .setExpirationTime(`${TTL}s`)
    .sign(key());
}

async function verify(token: string): Promise<PlatformClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: ISS, audience: AUD, algorithms: ["HS256"] });
    return { sub: payload.sub!, tv: payload.tv as number, name: payload.name as string, username: payload.username as string };
  } catch {
    return null;
  }
}

const cache = new Map<string, number>();
export const invalidatePlatformCache = () => cache.clear();

async function stillValid(c: PlatformClaims) {
  const k = `${c.sub}:${c.tv}`;
  const hit = cache.get(k);
  if (hit && hit > Date.now()) return true;
  const [a] = await db.select({ tv: schema.platformAdmins.tokenVersion }).from(schema.platformAdmins).where(eq(schema.platformAdmins.id, c.sub));
  if (!a || a.tv !== c.tv) return false;
  cache.set(k, Date.now() + 15_000);
  return true;
}

export type PlatformCtx = PlatformClaims & { ip: string };

export function withPlatform<P = unknown>(handler: (req: NextRequest, ctx: PlatformCtx, params: P) => Promise<Response>) {
  return async (req: NextRequest, routeCtx: { params: Promise<P> }) => {
    try {
      const token = req.cookies.get(PLATFORM_COOKIE)?.value;
      const claims = token ? await verify(token) : null;
      if (!claims || !(await stillValid(claims))) throw new ApiError(401, "Phiên quản trị đã hết hạn");
      const params = (await routeCtx?.params) as P;
      const pid = (params as { id?: string } | undefined)?.id;
      if (pid !== undefined && !/^[0-9a-f-]{36}$/i.test(pid)) throw new ApiError(404, "Không tìm thấy");
      return await handler(req, { ...claims, ip: clientIp(req) }, params);
    } catch (e) {
      return fail(e);
    }
  };
}

export async function platformAudit(ctx: Pick<PlatformCtx, "sub" | "ip">, action: string, tenantId?: string | null, data?: unknown) {
  await db.insert(schema.platformAuditLogs).values({ adminId: ctx.sub, action, tenantId: tenantId ?? null, data: (data ?? null) as object, ip: ctx.ip });
}

// COOKIE_SECURE=0 chỉ dùng khi thử nghiệm qua http://IP trong mạng nội bộ (production thật luôn chạy HTTPS)
const secure = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE !== "0" : process.env.NODE_ENV === "production";
export function setPlatformCookies(res: NextResponse, token: string) {
  res.cookies.set(PLATFORM_COOKIE, token, { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: TTL });
  res.cookies.set("dk_pli", "1", { httpOnly: true, secure, sameSite: "strict", path: "/superdklab", maxAge: TTL });
}
export function clearPlatformCookies(res: NextResponse) {
  res.cookies.set(PLATFORM_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set("dk_pli", "", { path: "/superdklab", maxAge: 0 });
}
