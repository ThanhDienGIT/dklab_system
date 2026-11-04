import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { schema } from "@/lib/db";
import { ContractBody } from "@/lib/schemas";
import { deleteOwned, updateOwned } from "@/lib/services/crud";
import { assertOwned } from "@/lib/services/guard";

export const PATCH = withAuth<{ id: string }>("contract.manage", async (req, ctx, { id }) => {
  const b = await parseBody(req, ContractBody);
  await assertOwned(schema.customers, b.customerId, ctx.tid);
  await assertOwned(schema.catalogItems, b.itemId, ctx.tid);
  if (b.endDate && b.endDate < b.startDate) throw new ApiError(422, "Ngày kết thúc phải sau ngày bắt đầu");
  const row = await updateOwned(schema.contracts, id, ctx.tid, b);
  await audit(ctx, "contract.update", "contract", id);
  return ok(row);
});
export const DELETE = withAuth<{ id: string }>("contract.manage", async (_req, ctx, { id }) => {
  await deleteOwned(schema.contracts, id, ctx.tid);
  await audit(ctx, "contract.delete", "contract", id);
  return ok({ id });
});
