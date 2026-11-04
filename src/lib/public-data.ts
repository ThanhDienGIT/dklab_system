import "server-only";
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "./db";

/**
 * Dữ liệu trang public: cache phía server ('use cache'), xóa theo tag "tours:<tenantId>"
 * mỗi khi admin sửa tour / xác nhận đặt chỗ => trang luôn nhanh mà vẫn đúng số chỗ.
 */
const T = schema.tours;
const D = schema.tourDepartures;

export async function getPublicTours(tenantId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(`tours:${tenantId}`);
  return db
    .select({
      id: T.id, slug: T.slug, title: T.title, summary: T.summary, location: T.location, departFrom: T.departFrom,
      durationDays: T.durationDays, durationNights: T.durationNights, basePrice: T.basePrice, imageUrl: T.imageUrl,
      nextDate: sql<string | null>`(select min(${D.departDate})::text from ${D} where ${D.tourId} = ${T.id} and ${D.departDate} >= current_date and ${D.status} = 'open' and ${D.seatsBooked} < ${D.seatsTotal})`,
    })
    .from(T)
    .where(and(eq(T.tenantId, tenantId), eq(T.isPublished, true)))
    .orderBy(asc(T.sortOrder), asc(T.title));
}

export async function getPublicTour(tenantId: string, slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(`tours:${tenantId}`);
  const [tour] = await db.select().from(T).where(and(eq(T.tenantId, tenantId), eq(T.slug, slug), eq(T.isPublished, true)));
  if (!tour) return null;
  const departures = await db
    .select({ id: D.id, departDate: D.departDate, seatsTotal: D.seatsTotal, seatsBooked: D.seatsBooked, price: D.price, status: D.status })
    .from(D)
    .where(and(eq(D.tourId, tour.id), gte(D.departDate, sql`current_date`)))
    .orderBy(asc(D.departDate));
  const { createdAt: _c, updatedAt: _u, ...rest } = tour;
  return { ...rest, departures };
}
export type PublicTour = NonNullable<Awaited<ReturnType<typeof getPublicTour>>>;

/** Danh mục công khai (menu / dịch vụ / loại phòng) — cache theo tag catalog:<tenantId> */
export async function getPublicCatalog(tenantId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(`catalog:${tenantId}`);
  const C = schema.catalogCategories;
  const I = schema.catalogItems;
  const [categories, items] = await Promise.all([
    db.select({ id: C.id, name: C.name }).from(C).where(and(eq(C.tenantId, tenantId), eq(C.isActive, true))).orderBy(asc(C.sortOrder), asc(C.name)),
    db
      .select({ id: I.id, categoryId: I.categoryId, name: I.name, description: I.description, price: I.price, durationMin: I.durationMin, capacity: I.capacity, imageUrl: I.imageUrl, tags: I.tags })
      .from(I)
      .where(and(eq(I.tenantId, tenantId), eq(I.isActive, true)))
      .orderBy(asc(I.sortOrder), asc(I.name)),
  ]);
  return { categories, items };
}
export type PublicCatalog = Awaited<ReturnType<typeof getPublicCatalog>>;
