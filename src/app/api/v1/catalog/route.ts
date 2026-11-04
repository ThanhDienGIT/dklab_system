import { asc, eq } from "drizzle-orm";
import { ok, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";

export const GET = withAuth("catalog.view", async (_req, ctx) => {
  const [categories, items] = await Promise.all([
    db.select().from(schema.catalogCategories).where(eq(schema.catalogCategories.tenantId, ctx.tid)).orderBy(asc(schema.catalogCategories.sortOrder), asc(schema.catalogCategories.name)),
    db.select().from(schema.catalogItems).where(eq(schema.catalogItems.tenantId, ctx.tid)).orderBy(asc(schema.catalogItems.sortOrder), asc(schema.catalogItems.name)),
  ]);
  return ok({ categories, items });
});
