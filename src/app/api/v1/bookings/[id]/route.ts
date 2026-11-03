import { and, eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { ApiError, audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { optionalText } from "@/lib/validators";

const B = schema.bookingRequests;
const D = schema.tourDepartures;

async function load(tid: string, id: string) {
  const [b] = await db.select().from(B).where(and(eq(B.id, id), eq(B.tenantId, tid)));
  if (!b) throw new ApiError(404, "Không tìm thấy yêu cầu đặt chỗ");
  return b;
}

export const GET = withAuth<{ id: string }>("booking.view", async (_req, ctx, { id }) => {
  const b = await load(ctx.tid, id);
  if (ctx.scope === "own" && b.assignedTo !== ctx.sub) throw new ApiError(403, "Yêu cầu này không được giao cho bạn");
  let unitPrice: { adult: number; child: number } | null = null;
  if (b.resourceType === "tour" && b.resourceId) {
    const [t] = await db.select().from(schema.tours).where(eq(schema.tours.id, b.resourceId));
    const [d] = b.slotId ? await db.select().from(D).where(eq(D.id, b.slotId)) : [];
    if (t) unitPrice = { adult: d?.price ?? t.basePrice, child: t.childPrice || (d?.price ?? t.basePrice) };
  }
  return ok({ ...b, unitPrice });
});

const Patch = z.object({
  status: z.enum(["new", "contacted", "confirmed", "completed", "cancelled"]).optional(),
  staffNote: optionalText(2000),
  assignedTo: z.uuid().nullable().optional(),
  adults: z.coerce.number().int().min(1).optional(),
  children: z.coerce.number().int().min(0).optional(),
});

/** Chiếm / trả chỗ của lịch khởi hành khi xác nhận / hủy (khóa dòng để tránh bán vượt số chỗ). */
async function adjustSeats(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], slotId: string, delta: number) {
  const [dep] = await tx.select().from(D).where(eq(D.id, slotId)).for("update");
  if (!dep) return;
  if (delta > 0 && dep.seatsBooked + delta > dep.seatsTotal)
    throw new ApiError(409, `Không đủ chỗ: lịch này còn ${dep.seatsTotal - dep.seatsBooked} chỗ`);
  await tx.update(D).set({ seatsBooked: sql`greatest(0, ${D.seatsBooked} + ${delta})` }).where(eq(D.id, slotId));
}

export const PATCH = withAuth<{ id: string }>("booking.handle", async (req, ctx, { id }) => {
  const body = await parseBody(req, Patch);
  const cur = await load(ctx.tid, id);
  if (ctx.scope === "own" && cur.assignedTo !== ctx.sub) throw new ApiError(403, "Yêu cầu này không được giao cho bạn");

  const holdsSeat = (s: string) => s === "confirmed" || s === "completed";
  const nextStatus = body.status ?? cur.status;
  const party = (body.adults ?? cur.adults) + (body.children ?? cur.children);
  const oldParty = cur.adults + cur.children;

  const updated = await db.transaction(async (tx) => {
    if (cur.slotId) {
      const before = holdsSeat(cur.status) ? oldParty : 0;
      const after = holdsSeat(nextStatus) ? party : 0;
      if (after !== before) await adjustSeats(tx, cur.slotId, after - before);
    }
    const [r] = await tx
      .update(B)
      .set({
        ...body,
        // Ai tiếp nhận đầu tiên sẽ được gán xử lý
        assignedTo: body.assignedTo !== undefined ? body.assignedTo : (cur.assignedTo ?? ctx.sub),
        handledAt: cur.handledAt ?? (body.status && body.status !== "new" ? new Date() : null),
      })
      .where(eq(B.id, id))
      .returning();
    return r;
  });
  if (cur.slotId) revalidateTag(`tours:${ctx.tid}`, { expire: 0 });
  await audit(ctx, "booking.update", "booking", id, { from: cur.status, to: nextStatus, note: body.staffNote });
  return ok(updated);
});

export const DELETE = withAuth<{ id: string }>("booking.delete", async (_req, ctx, { id }) => {
  const cur = await load(ctx.tid, id);
  await db.transaction(async (tx) => {
    if (cur.slotId && (cur.status === "confirmed" || cur.status === "completed")) await adjustSeats(tx, cur.slotId, -(cur.adults + cur.children));
    await tx.delete(B).where(eq(B.id, id));
  });
  await audit(ctx, "booking.delete", "booking", id, { code: cur.code });
  return ok({ id });
});
