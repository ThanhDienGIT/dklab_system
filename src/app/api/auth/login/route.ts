import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { clientIp, fail, parseBody, ApiError } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { rateLimit, resetLimit } from "@/lib/ratelimit";
import { login, setAuthCookies } from "@/lib/auth/session";
import { getTenantFresh } from "@/lib/tenant";

const Body = z.object({
  identifier: z.string().trim().min(3, "Nhập email hoặc số điện thoại"),
  password: z.string().min(1, "Nhập mật khẩu"),
  /** true => trả token trong body cho app mobile / POS (dùng header Bearer) */
  returnTokens: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    // Chống brute force / credential stuffing: theo IP (20 lần / 10 phút)
    const byIp = await rateLimit(`login:ip:${ip}`, 20, 600);
    if (!byIp.ok) throw new ApiError(429, `Thử đăng nhập quá nhiều lần. Vui lòng thử lại sau ${Math.ceil(byIp.resetSec / 60)} phút`);
    const body = await parseBody(req, Body);
    const tenant = await getTenantFresh(req.headers.get("x-tenant-key") ?? "");
    if (!tenant) throw new ApiError(404, "Không tìm thấy doanh nghiệp cho tên miền này");
    if (tenant.status !== "active") throw new ApiError(403, "Doanh nghiệp đang bị tạm khóa");
    // Theo tài khoản + IP: kẻ xấu ở IP khác không khóa được tài khoản của người thật
    const acctKey = `login:acct:${tenant.id}:${body.identifier.toLowerCase()}:${ip}`;
    const byAcct = await rateLimit(acctKey, 8, 900);
    if (!byAcct.ok) throw new ApiError(429, "Sai mật khẩu quá nhiều lần. Vui lòng thử lại sau 15 phút");
    let t;
    try {
      t = await login({ tenant, identifier: body.identifier, password: body.password, userAgent: req.headers.get("user-agent"), ip });
    } catch (e) {
      await db.insert(schema.auditLogs).values({ tenantId: tenant.id, action: "auth.login_failed", entity: "user", data: { identifier: body.identifier.slice(0, 120) }, ip });
      throw e;
    }
    await resetLimit(acctKey);
    await db.insert(schema.auditLogs).values({ tenantId: tenant.id, userId: t.claims.sub, action: "auth.login", entity: "user", entityId: t.claims.sub, ip });
    const res = NextResponse.json({
      ok: true,
      data: {
        user: { id: t.claims.sub, name: t.claims.name, roles: t.claims.roles, perms: t.claims.perms },
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name, industry: tenant.industry },
        ...(body.returnTokens ? { accessToken: t.accessToken, refreshToken: t.refreshToken } : {}),
      },
    });
    setAuthCookies(res, t);
    return res;
  } catch (e) {
    return fail(e);
  }
}
