import { and, asc, eq, gt, inArray, lt } from "drizzle-orm";
import { audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { ResourceBody } from "@/lib/schemas";
import { ACTIVE, addDays, vnDate, vnToday } from "@/lib/services/availability";
import { invalidateCatalog } from "@/lib/services/crud";
import { assertOwned } from "@/lib/services/guard";

const R = schema.resources;
const V = schema.reservations;
const B = schema.bookingRequests;

/** Tài nguyên + trạng thái trực tiếp: đang dùng / lượt kế tiếp hôm nay (cho sơ đồ bàn / phòng). */
export const GET = withAuth("resource.view", async (_req, ctx) => {
  const now = new Date();
  const end = vnDate(addDays(vnToday(), 1));
  const [rows, resv] = await Promise.all([
    db.select().from(R).where(eq(R.tenantId, ctx.tid)).orderBy(asc(R.kind), asc(R.sortOrder), asc(R.name)),
    db
      .select({ r: V, fullName: B.fullName, phone: B.phone, code: B.code })
      .from(V)
      .leftJoin(B, eq(B.id, V.bookingId))
      .where(and(eq(V.tenantId, ctx.tid), inArray(V.status, [...ACTIVE]), gt(V.endAt, now), lt(V.startAt, end)))
      .orderBy(asc(V.startAt)),
  ]);
  const view = (x: (typeof resv)[number]) => ({ id: x.r.id, startAt: x.r.startAt, endAt: x.r.endAt, status: x.r.status, partySize: x.r.partySize, name: x.fullName ?? x.r.label, phone: x.phone, code: x.code, bookingId: x.r.bookingId });
  return ok(
    rows.map((r) => {
      const mine = resv.filter((x) => x.r.resourceId === r.id);
      const current = mine.find((x) => x.r.startAt <= now && x.r.endAt > now);
      const next = mine.find((x) => x.r.startAt > now);
      return { ...r, current: current ? view(current) : null, next: next ? view(next) : null };
    }),
  );
});

export const POST = withAuth("resource.manage", async (req, ctx) => {
  const b = await parseBody(req, ResourceBody);
  await assertOwned(schema.catalogItems, b.itemId, ctx.tid);
  const [row] = await db.insert(R).values({ ...b, tenantId: ctx.tid }).returning();
  invalidateCatalog(ctx.tid);
  await audit(ctx, "resource.create", "resource", row.id, { kind: b.kind, name: b.name });
  return ok(row);
});
