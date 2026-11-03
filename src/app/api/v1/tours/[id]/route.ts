import { and, asc, eq, ne } from "drizzle-orm";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { TourBody } from "@/lib/schemas";
import { invalidateTours } from "@/lib/services/cache";

const T = schema.tours;

export const GET = withAuth<{ id: string }>("tour.view", async (_req, ctx, { id }) => {
  const [t] = await db.select().from(T).where(and(eq(T.id, id), eq(T.tenantId, ctx.tid)));
  if (!t) throw new ApiError(404, "Không tìm thấy tour");
  const departures = await db.select().from(schema.tourDepartures).where(eq(schema.tourDepartures.tourId, id)).orderBy(asc(schema.tourDepartures.departDate));
  return ok({ ...t, departures });
});

export const PATCH = withAuth<{ id: string }>("tour.manage", async (req, ctx, { id }) => {
  const b = await parseBody(req, TourBody);
  const [dup] = await db.select({ id: T.id }).from(T).where(and(eq(T.tenantId, ctx.tid), eq(T.slug, b.slug), ne(T.id, id)));
  if (dup) throw new ApiError(409, "Slug đã tồn tại");
  const [row] = await db.update(T).set(b).where(and(eq(T.id, id), eq(T.tenantId, ctx.tid))).returning();
  if (!row) throw new ApiError(404, "Không tìm thấy tour");
  invalidateTours(ctx.tid);
  await audit(ctx, "tour.update", "tour", id);
  return ok(row);
});

export const DELETE = withAuth<{ id: string }>("tour.manage", async (_req, ctx, { id }) => {
  await db.delete(T).where(and(eq(T.id, id), eq(T.tenantId, ctx.tid)));
  invalidateTours(ctx.tid);
  await audit(ctx, "tour.delete", "tour", id);
  return ok({ id });
});
