import { desc, eq } from "drizzle-orm";
import { ok, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";

export const GET = withAuth("audit.view", async (_req, ctx) => {
  const A = schema.auditLogs;
  const items = await db
    .select({ a: A, user: schema.users.fullName })
    .from(A)
    .leftJoin(schema.users, eq(schema.users.id, A.userId))
    .where(eq(A.tenantId, ctx.tid))
    .orderBy(desc(A.createdAt))
    .limit(200);
  return ok(items.map((r) => ({ ...r.a, userName: r.user })));
});
