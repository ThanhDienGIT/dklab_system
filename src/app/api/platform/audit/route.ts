import { desc, eq } from "drizzle-orm";
import { ok } from "@/lib/api";
import { withPlatform } from "@/lib/auth/platform";
import { db, schema } from "@/lib/db";

export const GET = withPlatform(async () => {
  const L = schema.platformAuditLogs;
  const rows = await db
    .select({ l: L, admin: schema.platformAdmins.username, tenant: schema.tenants.name })
    .from(L)
    .leftJoin(schema.platformAdmins, eq(schema.platformAdmins.id, L.adminId))
    .leftJoin(schema.tenants, eq(schema.tenants.id, L.tenantId))
    .orderBy(desc(L.createdAt))
    .limit(300);
  return ok(rows.map((r) => ({ ...r.l, adminName: r.admin, tenantName: r.tenant })));
});
