import { and, asc, eq, sql } from "drizzle-orm";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { TourBody } from "@/lib/schemas";
import { invalidateTours } from "@/lib/services/cache";

const T = schema.tours;
const D = schema.tourDepartures;

export const GET = withAuth("tour.view", async (_req, ctx) => {
  const items = await db
    .select({
      t: T,
      departures: sql<number>`(select count(*)::int from ${D} where ${D.tourId} = ${T.id} and ${D.departDate} >= current_date)`,
      seatsLeft: sql<number>`(select coalesce(sum(${D.seatsTotal} - ${D.seatsBooked}),0)::int from ${D} where ${D.tourId} = ${T.id} and ${D.departDate} >= current_date and ${D.status} = 'open')`,
    })
    .from(T)
    .where(eq(T.tenantId, ctx.tid))
    .orderBy(asc(T.sortOrder), asc(T.title));
  return ok(items.map((r) => ({ ...r.t, upcomingDepartures: r.departures, seatsLeft: r.seatsLeft })));
});

export const POST = withAuth("tour.manage", async (req, ctx) => {
  const b = await parseBody(req, TourBody);
  const [dup] = await db.select({ id: T.id }).from(T).where(and(eq(T.tenantId, ctx.tid), eq(T.slug, b.slug)));
  if (dup) throw new ApiError(409, "Slug đã tồn tại");
  const [row] = await db.insert(T).values({ ...b, tenantId: ctx.tid }).returning();
  invalidateTours(ctx.tid);
  await audit(ctx, "tour.create", "tour", row.id);
  return ok(row);
});
