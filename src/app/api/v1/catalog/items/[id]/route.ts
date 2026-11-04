import { audit, ok, parseBody, withAuth } from "@/lib/api";
import { schema } from "@/lib/db";
import { CatalogItemBody } from "@/lib/schemas";
import { deleteOwned, invalidateCatalog, updateOwned } from "@/lib/services/crud";
import { assertOwned } from "@/lib/services/guard";

export const PATCH = withAuth<{ id: string }>("catalog.manage", async (req, ctx, { id }) => {
  const b = await parseBody(req, CatalogItemBody);
  await assertOwned(schema.catalogCategories, b.categoryId, ctx.tid);
  const row = await updateOwned(schema.catalogItems, id, ctx.tid, b);
  invalidateCatalog(ctx.tid);
  await audit(ctx, "catalog.item.update", "catalog_item", id);
  return ok(row);
});
export const DELETE = withAuth<{ id: string }>("catalog.manage", async (_req, ctx, { id }) => {
  await deleteOwned(schema.catalogItems, id, ctx.tid);
  invalidateCatalog(ctx.tid);
  await audit(ctx, "catalog.item.delete", "catalog_item", id);
  return ok({ id });
});
