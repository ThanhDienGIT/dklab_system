import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { clientIp, fail, parseBody, ApiError } from "@/lib/api";
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
    const body = await parseBody(req, Body);
    const tenant = await getTenantFresh(req.headers.get("x-tenant-key") ?? "");
    if (!tenant) throw new ApiError(404, "Không tìm thấy doanh nghiệp cho tên miền này");
    if (tenant.status !== "active") throw new ApiError(403, "Doanh nghiệp đang bị tạm khóa");
    const t = await login({ tenant, identifier: body.identifier, password: body.password, userAgent: req.headers.get("user-agent"), ip: clientIp(req) });
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
