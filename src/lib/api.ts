import "server-only";
import { unstable_rethrow } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
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

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Body phải là JSON");
  }
  return schema.parse(json);
}

export type AuthContext = AccessClaims & { scope: Scope; ip: string | null };

function bearer(req: NextRequest) {
  const h = req.headers.get("authorization");
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return req.cookies.get(ACCESS_COOKIE)?.value;
}

export const clientIp = (req: NextRequest) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip");

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
      if (!claims) throw new ApiError(401, "Phiên đăng nhập đã hết hạn");
      let scope: Scope = "tenant";
      if (permission) {
        if (!hasPermission(claims.perms, permission)) throw new ApiError(403, "Bạn không có quyền thực hiện thao tác này");
        scope = permissionScope(claims.perms, permission) ?? "own";
      }
      const params = (await routeCtx?.params) as P;
      return await handler(req, { ...claims, scope, ip: clientIp(req) }, params);
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
