import "server-only";
import { and, eq, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { ApiError } from "../api";
import { db, schema } from "../db";

type TenantTable = PgTable & { id: PgColumn; tenantId: PgColumn };

const LABEL = new Map<unknown, string>([
  [schema.customers, "Khách hàng"],
  [schema.users, "Tài khoản"],
  [schema.branches, "Chi nhánh"],
  [schema.tours, "Tour"],
  [schema.tourDepartures, "Lịch khởi hành"],
  [schema.bookingRequests, "Đặt chỗ"],
  [schema.catalogCategories, "Nhóm danh mục"],
  [schema.catalogItems, "Mục danh mục"],
  [schema.resources, "Tài nguyên"],
]);

/**
 * Chặn tấn công IDOR chéo tenant: mọi ID nhận từ client (customerId, userId, slotId…)
 * phải thuộc đúng tenant trong JWT. Bỏ qua khi id rỗng.
 */
export async function assertOwned(table: TenantTable, id: string | null | undefined, tid: string, extra?: SQL) {
  if (!id) return;
  const [row] = await db
    .select({ id: table.id })
    .from(table as PgTable)
    .where(and(eq(table.id, id), eq(table.tenantId, tid), extra))
    .limit(1);
  if (!row) throw new ApiError(422, `${LABEL.get(table) ?? "Dữ liệu"} không tồn tại`);
}
