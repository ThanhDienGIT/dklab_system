import { and, eq } from "drizzle-orm";
import { audit, ok, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { invalidateTenant } from "@/lib/services/cache";

export const DELETE = withAuth<{ id: string }>("settings.manage", async (_req, ctx, { id }) => {
  await db.delete(schema.tenantDomains).where(and(eq(schema.tenantDomains.id, id), eq(schema.tenantDomains.tenantId, ctx.tid)));
  invalidateTenant();
  await audit(ctx, "domain.delete", "domain", id);
  return ok({ id });
});
