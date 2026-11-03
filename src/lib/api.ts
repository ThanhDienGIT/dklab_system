import "server-only";
import { unstable_rethrow } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "./db";
import { ACCESS_COOKIE, verifyAccessToken, type AccessClaims } from "./auth/jwt";
import { hasPermission, permissionScope, type Scope } from "@/modules/registry";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json({ ok: true, data }, init);

export function fail(e: unknown) {
  // Không nuốt lỗi nội bộ của Next (đánh dấu dynamic / notFound / redirect)
  unstable_rethrow(e);
  if (e instanceof ApiError) return NextResponse.json({ ok: false, error: e.message, details: e.details }, { status: e.status });
  if (e instanceof ZodError)
    return NextResponse.json(
      { ok: false, error: e.issues[0]?.message ?? "Dữ liệu không hợp lệ", details: e.issues },
      { status: 422 },
    );
  console.error(e);
  return NextResponse.json({ ok: false, error: "Lỗi hệ thống, vui lòng thử lại" }, { status: 500 });
}

/**
 * Đọc body JSON an toàn:
 *  - bắt buộc Content-Type: application/json (form/text-plain cross-site => 415, chặn CSRF "simple request")
 *  - giới hạn kích thước (mặc định 100KB)
 */
export async function parseBody<T>(req: Request, schema: ZodType<T>, maxBytes = 100_000): Promise<T> {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().startsWith("application/json")) throw new ApiError(415, "Content-Type phải là application/json");
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new ApiError(413, "Dữ liệu gửi lên quá lớn");
  const text = await req.text();
  if (text.length > maxBytes) throw new ApiError(413, "Dữ liệu gửi lên quá lớn");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ApiError(400, "Body phải là JSON");
  }
  return schema.parse(json);
}

export type AuthContext = AccessClaims & { scope: Scope; ip: string | null; isOwner: boolean };

function bearer(req: NextRequest) {
  const h = req.headers.get("authorization");
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return req.cookies.get(ACCESS_COOKIE)?.value;
}

/**
 * IP client. Trên Vercel dùng header do Vercel ghi (client không giả được).
 * Tự host: đặt reverse proxy (nginx/Caddy) ghi đè X-Real-IP.
 */
export const clientIp = (req: Request): string =>
  req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
  req.headers.get("x-real-ip")?.trim() ||
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  "unknown";

/* ───────── Kiểm tra trạng thái phiên (thu hồi tức thì) ─────────
 * JWT tự thân không thu hồi được. Mỗi request kiểm tra thêm: phiên chưa đăng xuất,
 * user còn hoạt động, tokenVersion khớp (đổi quyền / mật khẩu), tenant không bị khóa.
 * Cache 15 giây / phiên để không truy vấn DB mỗi request. Thay đổi trên cùng instance xóa cache ngay. */
const SESSION_CACHE_MS = 15_000;
const sessionCache = new Map<string, { ok: boolean; exp: number }>();

export function invalidateAuthCache() {
  sessionCache.clear();
}

async function sessionValid(c: AccessClaims): Promise<boolean> {
  const key = `${c.sid}:${c.tv}`;
  const hit = sessionCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.ok;
  const [row] = await db
    .select({ id: schema.sessions.id })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.users.tenantId))
    .where(
      and(
        eq(schema.sessions.id, c.sid),
        eq(schema.sessions.userId, c.sub),
        eq(schema.users.tenantId, c.tid),
        isNull(schema.sessions.revokedAt),
        gt(schema.sessions.expiresAt, new Date()),
        eq(schema.users.status, "active"),
        eq(schema.users.tokenVersion, c.tv),
        eq(schema.tenants.status, "active"),
      ),
    )
    .limit(1);
  const ok = !!row;
  if (sessionCache.size > 10_000) sessionCache.clear();
  sessionCache.set(key, { ok, exp: Date.now() + SESSION_CACHE_MS });
  return ok;
}

/**
 * Bọc route handler: xác thực JWT (cookie httpOnly hoặc Bearer cho mobile/POS) + kiểm tra quyền.
 * Trả về scope của quyền (own/branch/tenant) để handler lọc dữ liệu.
 */
export function withAuth<P = unknown>(
  permission: string | null,
  handler: (req: NextRequest, ctx: AuthContext, params: P) => Promise<Response>,
) {
  return async (req: NextRequest, routeCtx: { params: Promise<P> }) => {
    try {
      const token = bearer(req);
      const claims = token ? await verifyAccessToken(token) : null;
      if (!claims || !(await sessionValid(claims))) throw new ApiError(401, "Phiên đăng nhập đã hết hạn");
      let scope: Scope = "tenant";
      if (permission) {
        if (!hasPermission(claims.perms, permission)) throw new ApiError(403, "Bạn không có quyền thực hiện thao tác này");
        scope = permissionScope(claims.perms, permission) ?? "own";
      }
      const params = (await routeCtx?.params) as P;
      // Mọi tham số [id] trên URL phải là UUID hợp lệ (tránh lỗi SQL 500 / dò dữ liệu)
      const pid = (params as { id?: string } | undefined)?.id;
      if (pid !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pid))
        throw new ApiError(404, "Không tìm thấy dữ liệu");
      return await handler(req, { ...claims, scope, ip: clientIp(req), isOwner: claims.perms.includes("*") }, params);
    } catch (e) {
      return fail(e);
    }
  };
}

export async function audit(
  ctx: Pick<AuthContext, "tid" | "sub" | "ip">,
  action: string,
  entity: string,
  entityId?: string | null,
  data?: unknown,
) {
  await db.insert(schema.auditLogs).values({
    tenantId: ctx.tid,
    userId: ctx.sub,
    action,
    entity,
    entityId: entityId ?? null,
    data: (data ?? null) as object,
    ip: ctx.ip,
  });
}
