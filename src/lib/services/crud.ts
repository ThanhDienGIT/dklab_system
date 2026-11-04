import "server-only";
import { and, eq } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { revalidateTag } from "next/cache";
import { ApiError } from "../api";
import { db } from "../db";

type TT = PgTable & { id: PgColumn; tenantId: PgColumn };

/** Cập nhật / xóa một dòng thuộc tenant (luôn lọc tenant_id). */
export async function updateOwned<T extends TT>(table: T, id: string, tid: string, values: Record<string, unknown>) {
  const rows = await db.update(table as PgTable).set(values).where(and(eq(table.id, id), eq(table.tenantId, tid))).returning();
  if (!rows.length) throw new ApiError(404, "Không tìm thấy dữ liệu");
  return rows[0];
}
export async function deleteOwned<T extends TT>(table: T, id: string, tid: string) {
  const rows = await db.delete(table as PgTable).where(and(eq(table.id, id), eq(table.tenantId, tid))).returning({ id: table.id });
  if (!rows.length) throw new ApiError(404, "Không tìm thấy dữ liệu");
  return rows[0];
}
/** Danh mục / tài nguyên đổi => trang public cập nhật ngay */
export const invalidateCatalog = (tid: string) => revalidateTag(`catalog:${tid}`, { expire: 0 });
