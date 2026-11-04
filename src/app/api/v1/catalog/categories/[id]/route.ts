import { audit, ok, parseBody, withAuth } from "@/lib/api";
import { schema } from "@/lib/db";
import { CategoryBody } from "@/lib/schemas";
import { deleteOwned, invalidateCatalog, updateOwned } from "@/lib/services/crud";

export const PATCH = withAuth<{ id: string }>("catalog.manage", async (req, ctx, { id }) => {
  const row = await updateOwned(schema.catalogCategories, id, ctx.tid, await parseBody(req, CategoryBody));
  invalidateCatalog(ctx.tid);
  await audit(ctx, "catalog.category.update", "catalog_category", id);
  return ok(row);
});
export const DELETE = withAuth<{ id: string }>("catalog.manage", async (_req, ctx, { id }) => {
  await deleteOwned(schema.catalogCategories, id, ctx.tid);
  invalidateCatalog(ctx.tid);
  await audit(ctx, "catalog.category.delete", "catalog_category", id);
  return ok({ id });
});
