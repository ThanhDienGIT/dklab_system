import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { appSecret } from "../env";

export const ACCESS_TTL_SEC = 15 * 60; // 15 phút
export const REFRESH_TTL_SEC = 30 * 24 * 60 * 60; // 30 ngày
export const ACCESS_COOKIE = "dk_at";
export const REFRESH_COOKIE = "dk_rt";
const ISSUER = "dklab";

export type AccessClaims = {
  sub: string; // userId
  tid: string; // tenantId
  ts: string; // tenant slug (aud)
  sid: string; // sessionId
  tv: number; // token version
  name: string;
  perms: string[];
  roles: string[];
};

const key = () => new TextEncoder().encode(`jwt:${appSecret()}`);

export async function signAccessToken(c: AccessClaims): Promise<string> {
  const { sub, ts, ...rest } = c;
  return new SignJWT({ ...rest, ts })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(sub)
    .setIssuer(ISSUER)
    .setAudience(`tenant:${ts}`)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(key());
}

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: ISSUER, algorithms: ["HS256"] });
    const ts = payload.ts as string;
    // Token phải được cấp cho đúng tenant ghi trong claim (chặn dùng chéo tenant)
    if (payload.aud !== `tenant:${ts}`) return null;
    return {
      sub: payload.sub!,
      tid: payload.tid as string,
      ts,
      sid: payload.sid as string,
      tv: payload.tv as number,
      name: payload.name as string,
      perms: (payload.perms as string[]) ?? [],
      roles: (payload.roles as string[]) ?? [],
    };
  } catch {
    return null;
  }
}
