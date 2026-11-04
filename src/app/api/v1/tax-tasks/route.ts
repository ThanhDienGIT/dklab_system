import { and, asc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { addDays, vnToday } from "@/lib/services/availability";
import { TAX_KIND_LABEL, tasksBetween } from "@/lib/services/tax";

const T = schema.taxTasks;

/** Nghĩa vụ thuế của các khách trong khoảng ngày (mặc định: 30 ngày trước → 90 ngày tới) */
export const GET = withAuth("contract.view", async (req, ctx) => {
  const today = vnToday();
  const from = req.nextUrl.searchParams.get("from") ?? addDays(today, -30);
  const to = req.nextUrl.searchParams.get("to") ?? addDays(today, 90);
  const rows = await db
    .select({ t: T, customer: schema.customers.fullName, taxCode: schema.customers.taxCode, phone: schema.customers.phone, contract: schema.contracts.code })
    .from(T)
    .innerJoin(schema.customers, eq(schema.customers.id, T.customerId))
    .innerJoin(schema.contracts, eq(schema.contracts.id, T.contractId))
    .where(and(eq(T.tenantId, ctx.tid), gte(T.dueDate, from), lte(T.dueDate, to)))
    .orderBy(asc(T.dueDate), asc(schema.customers.fullName));
  return ok(rows.map((r) => ({ ...r.t, label: TAX_KIND_LABEL[r.t.kind] ?? r.t.kind, customerName: r.customer, customerTaxCode: r.taxCode, customerPhone: r.phone, contractCode: r.contract, overdue: r.t.status === "pending" && r.t.dueDate < today })));
});

/** Sinh lịch kê khai cho mọi hợp đồng đang hiệu lực (không tạo trùng) */
const Gen = z.object({ months: z.coerce.number().int().min(1).max(12).default(3) });
export const POST = withAuth("contract.manage", async (req, ctx) => {
  const { months } = await parseBody(req, Gen);
  const today = vnToday();
  const until = addDays(today, months * 31);
  const list = await db.select().from(schema.contracts).where(and(eq(schema.contracts.tenantId, ctx.tid), eq(schema.contracts.status, "active")));
  let created = 0;
  for (const c of list) {
    const from = c.startDate > addDays(today, -31) ? c.startDate : addDays(today, -31);
    const tasks = tasksBetween(c.taxPeriod as "monthly" | "quarterly", from, c.endDate && c.endDate < until ? c.endDate : until);
    if (!tasks.length) continue;
    const res = await db
      .insert(T)
      .values(tasks.map((t) => ({ ...t, tenantId: ctx.tid, contractId: c.id, customerId: c.customerId })))
      .onConflictDoNothing()
      .returning({ id: T.id });
    created += res.length;
  }
  await audit(ctx, "tax.generate", "tax_task", null, { created, months });
  return ok({ created, contracts: list.length });
});
