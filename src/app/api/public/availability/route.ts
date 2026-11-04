import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, clientIp, fail, ok } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";
import { roomAvailability, slotAvailability, tableAvailability, timeOptions, bookingConfig, vnToday } from "@/lib/services/availability";
import { getTenantFresh } from "@/lib/tenant";

const date = z.iso.date();
const Q = z.discriminatedUnion("type", [
  z.object({ type: z.literal("slots"), itemId: z.uuid(), date, staffId: z.uuid().optional() }),
  z.object({ type: z.literal("tables"), date, time: z.string().regex(/^\d{2}:\d{2}$/), party: z.coerce.number().int().min(1).max(100) }),
  z.object({ type: z.literal("times"), date }),
  z.object({ type: z.literal("rooms"), checkIn: date, checkOut: date, guests: z.coerce.number().int().min(1).max(50).default(2) }),
]);

/** Lịch trống công khai (không cần đăng nhập): khung giờ / bàn / phòng còn trống. */
export async function GET(req: NextRequest) {
  try {
    if (!(await rateLimit(`avail:${clientIp(req)}`, 120, 60)).ok) throw new ApiError(429, "Thao tác quá nhanh, vui lòng thử lại");
    const q = Q.parse(Object.fromEntries(req.nextUrl.searchParams));
    const t = await getTenantFresh(req.headers.get("x-tenant-key") ?? "");
    if (!t || t.status !== "active") throw new ApiError(404, "Không tìm thấy doanh nghiệp");
    if ("date" in q && q.date < vnToday()) throw new ApiError(422, "Ngày đã qua");
    if ("date" in q && q.date > new Date(Date.now() + 180 * 86400_000).toISOString().slice(0, 10)) throw new ApiError(422, "Chỉ nhận đặt trong 180 ngày tới");
    switch (q.type) {
      case "slots": {
        const r = await slotAvailability(t, q.itemId, q.date, q.staffId);
        return ok({ ...r, slots: r.slots.map(({ time, available }) => ({ time, available })) });
      }
      case "tables":
        return ok(await tableAvailability(t, q.date, q.time, q.party));
      case "times":
        return ok({ times: timeOptions(bookingConfig(t), 30, q.date) });
      case "rooms": {
        const r = await roomAvailability(t, q.checkIn, q.checkOut, q.guests);
        return ok({ ...r, types: r.types.map(({ freeRoomIds: _f, ...x }) => x) });
      }
    }
  } catch (e) {
    return fail(e);
  }
}
