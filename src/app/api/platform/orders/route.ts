import { desc, eq } from "drizzle-orm";
import { ok } from "@/lib/api";
import { withPlatform } from "@/lib/auth/platform";
import { db, schema } from "@/lib/db";

export const GET = withPlatform(async (req) => {
  const status = req.nextUrl.searchParams.get("status");
  const O = schema.addonOrders;
  const q = db
    .select({ o: O, tenant: schema.tenants.name, slug: schema.tenants.slug })
    .from(O)
    .innerJoin(schema.tenants, eq(schema.tenants.id, O.tenantId))
    .orderBy(desc(O.createdAt))
    .limit(300);
  const rows = status && status !== "all" ? await q.where(eq(O.status, status)) : await q;
  return ok(rows.map((r) => ({ ...r.o, tenantName: r.tenant, tenantSlug: r.slug })));
});
