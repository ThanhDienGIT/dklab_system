import { audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { CatalogItemBody } from "@/lib/schemas";
import { invalidateCatalog } from "@/lib/services/crud";
import { assertOwned } from "@/lib/services/guard";

export const POST = withAuth("catalog.manage", async (req, ctx) => {
  const b = await parseBody(req, CatalogItemBody);
  await assertOwned(schema.catalogCategories, b.categoryId, ctx.tid);
  const [row] = await db.insert(schema.catalogItems).values({ ...b, tenantId: ctx.tid }).returning();
  invalidateCatalog(ctx.tid);
  await audit(ctx, "catalog.item.create", "catalog_item", row.id);
  return ok(row);
});
