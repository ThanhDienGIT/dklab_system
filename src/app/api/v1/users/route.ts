import { and, asc, eq, or } from "drizzle-orm";
import { z } from "zod";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { db, schema } from "@/lib/db";
import { emailSchema, phoneSchema } from "@/lib/validators";
import { assertRolesInTenant } from "@/lib/services/users";

const U = schema.users;

export const GET = withAuth("users.manage", async (_req, ctx) => {
  const [users, links, roles] = await Promise.all([
    db
      .select({ id: U.id, fullName: U.fullName, email: U.email, phone: U.phone, status: U.status, lastLoginAt: U.lastLoginAt, createdAt: U.createdAt })
      .from(U)
      .where(eq(U.tenantId, ctx.tid))
      .orderBy(asc(U.createdAt)),
    db
      .select({ userId: schema.userRoles.userId, roleId: schema.userRoles.roleId })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
      .where(eq(schema.roles.tenantId, ctx.tid)),
    db.select().from(schema.roles).where(eq(schema.roles.tenantId, ctx.tid)).orderBy(asc(schema.roles.createdAt)),
  ]);
  return ok({
    items: users.map((u) => ({ ...u, roleIds: links.filter((l) => l.userId === u.id).map((l) => l.roleId) })),
    roles,
  });
});

const Body = z
  .object({
    fullName: z.string().trim().min(2, "Nhập họ tên"),
    email: emailSchema.optional().default(""),
    phone: phoneSchema.optional().default(""),
    password: z.string(),
    roleIds: z.array(z.uuid()).min(1, "Chọn ít nhất 1 vai trò"),
  })
  .refine((b) => b.email || b.phone, { message: "Cần email hoặc SĐT để đăng nhập", path: ["email"] });


export const POST = withAuth("users.manage", async (req, ctx) => {
  const b = await parseBody(req, Body);
  const weak = validatePasswordStrength(b.password);
  if (weak) throw new ApiError(422, weak);
  await assertRolesInTenant(ctx.tid, b.roleIds);
  const conds = [b.email ? eq(U.email, b.email) : undefined, b.phone ? eq(U.phone, b.phone) : undefined].filter(Boolean);
  const [dup] = await db.select({ id: U.id }).from(U).where(and(eq(U.tenantId, ctx.tid), or(...conds)));
  if (dup) throw new ApiError(409, "Email hoặc SĐT đã được dùng cho tài khoản khác");
  const user = await db.transaction(async (tx) => {
    const [u] = await tx
      .insert(U)
      .values({ tenantId: ctx.tid, fullName: b.fullName, email: b.email || null, phone: b.phone || null, passwordHash: await hashPassword(b.password) })
      .returning({ id: U.id });
    await tx.insert(schema.userRoles).values(b.roleIds.map((roleId) => ({ userId: u.id, roleId })));
    return u;
  });
  await audit(ctx, "user.create", "user", user.id, { roleIds: b.roleIds });
  return ok(user);
});
