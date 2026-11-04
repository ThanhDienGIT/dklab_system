import { audit, ok, parseBody, withAuth } from "@/lib/api";
import { schema } from "@/lib/db";
import { ResourcePatchBody } from "@/lib/schemas";
import { deleteOwned, invalidateCatalog, updateOwned } from "@/lib/services/crud";
import { assertOwned } from "@/lib/services/guard";

export const PATCH = withAuth<{ id: string }>("resource.manage", async (req, ctx, { id }) => {
  const b = await parseBody(req, ResourcePatchBody);
  await assertOwned(schema.catalogItems, b.itemId, ctx.tid);
  const row = await updateOwned(schema.resources, id, ctx.tid, b);
  invalidateCatalog(ctx.tid);
  await audit(ctx, "resource.update", "resource", id);
  return ok(row);
});
export const DELETE = withAuth<{ id: string }>("resource.manage", async (_req, ctx, { id }) => {
  await deleteOwned(schema.resources, id, ctx.tid);
  invalidateCatalog(ctx.tid);
  await audit(ctx, "resource.delete", "resource", id);
  return ok({ id });
});
