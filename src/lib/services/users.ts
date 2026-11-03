import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { ApiError } from "../api";
import { db, schema } from "../db";

export async function assertRolesInTenant(tid: string, roleIds: string[]) {
  if (!roleIds.length) return;
  const found = await db.select({ id: schema.roles.id }).from(schema.roles).where(and(eq(schema.roles.tenantId, tid), inArray(schema.roles.id, roleIds)));
  if (found.length !== new Set(roleIds).size) throw new ApiError(422, "Vai trò không hợp lệ");
}
