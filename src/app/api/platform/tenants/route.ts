import { desc, sql } from "drizzle-orm";
import { z } from "zod";
import { ok, parseBody } from "@/lib/api";
import { platformAudit, withPlatform } from "@/lib/auth/platform";
import { db, schema } from "@/lib/db";
import { invalidateTenant } from "@/lib/services/cache";
import { provisionTenant } from "@/lib/services/provision";
import { emailSchema, phoneSchema } from "@/lib/validators";

const T = schema.tenants;

export const GET = withPlatform(async () => {
  const rows = await db
    .select({
      id: T.id, slug: T.slug, name: T.name, industry: T.industry, status: T.status, plan: T.plan, createdAt: T.createdAt,
      users: sql<number>`(select count(*)::int from users u where u.tenant_id = ${T.id})`,
      bookings30: sql<number>`(select count(*)::int from booking_requests b where b.tenant_id = ${T.id} and b.created_at >= now() - interval '30 days')`,
      revenue30: sql<number>`(select coalesce(sum(paid_amount),0)::bigint from invoices i where i.tenant_id = ${T.id} and i.created_at >= now() - interval '30 days')`,
      domains: sql<string[]>`(select coalesce(array_agg(domain), '{}') from tenant_domains d where d.tenant_id = ${T.id})`,
    })
    .from(T)
    .orderBy(desc(T.createdAt));
  return ok(rows.map((r) => ({ ...r, revenue30: Number(r.revenue30) })));
});

const Body = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_]{2,40}$/, "Mã chỉ gồm a-z, 0-9, _ (3–41 ký tự, bắt đầu bằng chữ)"),
  name: z.string().trim().min(2, "Nhập tên doanh nghiệp").max(120),
  industry: z.string().min(1, "Chọn ngành"),
  owner: z.object({
    fullName: z.string().trim().min(2, "Nhập họ tên chủ doanh nghiệp"),
    email: emailSchema.refine((v) => !!v, "Nhập email đăng nhập của chủ"),
    phone: phoneSchema.optional(),
    password: z.string().min(1, "Nhập mật khẩu ban đầu"),
  }),
  contact: z.object({ phone: z.string().trim().max(30).optional(), address: z.string().trim().max(300).optional() }).optional(),
});

export const POST = withPlatform(async (req, ctx) => {
  const b = await parseBody(req, Body);
  const { tenant } = await provisionTenant({ ...b, owner: { ...b.owner, phone: b.owner.phone || null } });
  invalidateTenant();
  await platformAudit(ctx, "tenant.create", tenant.id, { slug: b.slug, industry: b.industry, owner: b.owner.email });
  return ok({ id: tenant.id, slug: tenant.slug });
});
