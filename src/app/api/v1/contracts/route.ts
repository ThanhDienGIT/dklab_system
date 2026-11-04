import { desc, eq } from "drizzle-orm";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { ContractBody } from "@/lib/schemas";
import { shortCode } from "@/lib/services/codes";
import { assertOwned } from "@/lib/services/guard";

const C = schema.contracts;

export const GET = withAuth("contract.view", async (_req, ctx) => {
  const rows = await db
    .select({ c: C, customer: schema.customers.fullName, taxCode: schema.customers.taxCode, phone: schema.customers.phone, item: schema.catalogItems.name })
    .from(C)
    .innerJoin(schema.customers, eq(schema.customers.id, C.customerId))
    .leftJoin(schema.catalogItems, eq(schema.catalogItems.id, C.itemId))
    .where(eq(C.tenantId, ctx.tid))
    .orderBy(desc(C.createdAt));
  return ok(rows.map((r) => ({ ...r.c, customerName: r.customer, customerTaxCode: r.taxCode, customerPhone: r.phone, itemName: r.item })));
});

export const POST = withAuth("contract.manage", async (req, ctx) => {
  const b = await parseBody(req, ContractBody);
  await assertOwned(schema.customers, b.customerId, ctx.tid);
  await assertOwned(schema.catalogItems, b.itemId, ctx.tid);
  if (b.endDate && b.endDate < b.startDate) throw new ApiError(422, "Ngày kết thúc phải sau ngày bắt đầu");
  const [row] = await db.insert(C).values({ ...b, tenantId: ctx.tid, code: shortCode("HD") }).returning();
  await audit(ctx, "contract.create", "contract", row.id);
  return ok(row);
});

