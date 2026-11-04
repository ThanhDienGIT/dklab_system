import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { randomToken } from "@/lib/crypto";
import { db, schema } from "@/lib/db";
import { ROOT_DOMAIN } from "@/lib/env";

const D = schema.tenantDomains;

/** Hậu tố không cho khách khai báo: subdomain nền tảng, domain dùng chung của nhà cung cấp hosting */
const RESERVED = [ROOT_DOMAIN, "vercel.app", "vercel.com", "localhost", "meinvoice.vn", "netlify.app", "pages.dev"];

export const GET = withAuth("settings.manage", async (_req, ctx) => {
  const rows = await db.select().from(D).where(eq(D.tenantId, ctx.tid)).orderBy(asc(D.createdAt));
  return ok(rows.map((d) => ({ ...d, txtName: `_dklab-verify.${d.domain}`, txtValue: d.verifyToken ? `dklab-verify=${d.verifyToken}` : null })));
}, { module: "custom_domain" });

const Body = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v.replace(/^https?:\/\//, "").replace(/[/?#].*$/, "").replace(/\.$/, ""))
    .refine((v) => /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(v), "Tên miền không hợp lệ")
    .refine((v) => !RESERVED.some((r) => v === r || v.endsWith(`.${r}`)), "Không thể dùng tên miền này (thuộc nền tảng hoặc nhà cung cấp hosting)"),
  isPrimary: z.boolean().default(false),
});

export const POST = withAuth("settings.manage", async (req, ctx) => {
  const b = await parseBody(req, Body);
  const [dup] = await db.select({ id: D.id }).from(D).where(eq(D.domain, b.domain));
  if (dup) throw new ApiError(409, "Tên miền đã được khai báo");
  // Chưa có verifiedAt => chưa được định tuyến cho tới khi chủ domain thêm bản ghi TXT
  const [row] = await db.insert(D).values({ ...b, tenantId: ctx.tid, verifyToken: randomToken(16), verifiedAt: null }).returning();
  await audit(ctx, "domain.create", "domain", row.id, b);
  return ok({ ...row, txtName: `_dklab-verify.${row.domain}`, txtValue: `dklab-verify=${row.verifyToken}` });
}, { module: "custom_domain" });

