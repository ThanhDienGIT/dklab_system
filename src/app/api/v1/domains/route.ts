import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { invalidateTenant } from "@/lib/services/cache";

const D = schema.tenantDomains;

export const GET = withAuth("settings.manage", async (_req, ctx) => {
  return ok(await db.select().from(D).where(eq(D.tenantId, ctx.tid)).orderBy(asc(D.createdAt)));
});

const Body = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v.replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .refine((v) => /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(v), "Tên miền không hợp lệ"),
  isPrimary: z.boolean().default(false),
});

export const POST = withAuth("settings.manage", async (req, ctx) => {
  const b = await parseBody(req, Body);
  const [dup] = await db.select({ id: D.id }).from(D).where(eq(D.domain, b.domain));
  if (dup) throw new ApiError(409, "Tên miền đã được sử dụng");
  const [row] = await db.insert(D).values({ ...b, tenantId: ctx.tid }).returning();
  invalidateTenant();
  await audit(ctx, "domain.create", "domain", row.id, b);
  return ok(row);
});
