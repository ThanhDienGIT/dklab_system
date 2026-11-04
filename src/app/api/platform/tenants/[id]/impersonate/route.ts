import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, parseBody } from "@/lib/api";
import { platformAudit, withPlatform } from "@/lib/auth/platform";
import { impersonate, setAuthCookies } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";

const Body = z.object({ userId: z.uuid().optional(), reason: z.string().trim().min(5, "Nhập lý do (≥ 5 ký tự) để ghi nhật ký").max(300) });

/** Đăng nhập thay (mặc định: tài khoản Chủ) để hỗ trợ khách. Phiên 1 giờ, có banner cảnh báo, ghi nhật ký 2 phía. */
export const POST = withPlatform<{ id: string }>(async (req, ctx, { id }) => {
  const b = await parseBody(req, Body);
  const [t] = await db.select({ id: schema.tenants.id, slug: schema.tenants.slug, status: schema.tenants.status }).from(schema.tenants).where(eq(schema.tenants.id, id));
  if (!t) throw new ApiError(404, "Không tìm thấy doanh nghiệp");
  if (t.status !== "active") throw new ApiError(422, "Doanh nghiệp đang bị khóa, hãy mở khóa trước");
  let userId = b.userId;
  if (!userId) {
    const [owner] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .innerJoin(schema.userRoles, eq(schema.userRoles.userId, schema.users.id))
      .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
      .where(and(eq(schema.users.tenantId, id), eq(schema.roles.key, "owner"), eq(schema.users.status, "active")))
      .orderBy(sql`${schema.users.createdAt}`)
      .limit(1);
    if (!owner) throw new ApiError(404, "Doanh nghiệp chưa có tài khoản Chủ đang hoạt động");
    userId = owner.id;
  }
  const tokens = await impersonate(t, userId, ctx.sub);
  await platformAudit(ctx, "tenant.impersonate", id, { userId, reason: b.reason });
  await db.insert(schema.auditLogs).values({ tenantId: id, userId, action: "auth.impersonated", entity: "user", entityId: userId, data: { by: ctx.username, reason: b.reason }, ip: ctx.ip });
  const res = NextResponse.json({ ok: true, data: { redirect: "/admin" } });
  setAuthCookies(res, tokens);
  return res;
});
