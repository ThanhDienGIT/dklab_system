import { audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { RoleBody, validatePerms } from "@/lib/services/roles";

export const POST = withAuth("users.manage", async (req, ctx) => {
  const b = await parseBody(req, RoleBody);
  validatePerms(b.permissions);
  const key = `custom_${Date.now().toString(36)}`;
  const [row] = await db.insert(schema.roles).values({ ...b, key, tenantId: ctx.tid }).returning();
  await audit(ctx, "role.create", "role", row.id, b);
  return ok(row);
});
