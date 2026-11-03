import { and, eq } from "drizzle-orm";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { DepartureBody } from "@/lib/schemas";
import { invalidateTours } from "@/lib/services/cache";

export const POST = withAuth<{ id: string }>("tour.manage", async (req, ctx, { id }) => {
  const b = await parseBody(req, DepartureBody);
  const [t] = await db.select({ id: schema.tours.id }).from(schema.tours).where(and(eq(schema.tours.id, id), eq(schema.tours.tenantId, ctx.tid)));
  if (!t) throw new ApiError(404, "Không tìm thấy tour");
  const [row] = await db.insert(schema.tourDepartures).values({ ...b, price: b.price ?? null, tourId: id, tenantId: ctx.tid }).returning();
  invalidateTours(ctx.tid);
  await audit(ctx, "departure.create", "tour", id, b);
  return ok(row);
});
