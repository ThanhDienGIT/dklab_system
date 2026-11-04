import { audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { CategoryBody } from "@/lib/schemas";
import { invalidateCatalog } from "@/lib/services/crud";

export const POST = withAuth("catalog.manage", async (req, ctx) => {
  const b = await parseBody(req, CategoryBody);
  const [row] = await db.insert(schema.catalogCategories).values({ ...b, tenantId: ctx.tid }).returning();
  invalidateCatalog(ctx.tid);
  await audit(ctx, "catalog.category.create", "catalog_category", row.id);
  return ok(row);
});
