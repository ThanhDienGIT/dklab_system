import "server-only";
/**
 * Tính lịch trống cho 3 động cơ đặt chỗ: slots (spa/kế toán…), tables (cà phê/nhà hàng), rooms (khách sạn).
 * Giờ luôn tính theo Asia/Ho_Chi_Minh (+07:00). Chống trùng cuối cùng do ràng buộc EXCLUDE trong DB.
 */
import { and, asc, eq, gt, inArray, lt } from "drizzle-orm";
import { ApiError } from "../api";
import { db, schema } from "../db";
import { getPreset } from "@/modules/presets";
import type { BookingConfig } from "@/plugins/types";

export const ACTIVE = ["pending", "confirmed", "checked_in"] as const;
const R = schema.resources;
const V = schema.reservations;

/* ─────────── Thời gian VN ─────────── */
export const vnDate = (date: string, time = "00:00") => new Date(`${date}T${time}:00+07:00`);
export function vnToday(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}
export function vnHHMM(d: Date): string {
  return new Date(d.getTime() + 7 * 3600_000).toISOString().slice(11, 16);
}
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const nightsBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400_000);

/** Cấu hình đặt chỗ = mặc định của ngành, ghi đè bởi tenant.settings.booking */
export function bookingConfig(t: { industry: string; settings: schema.TenantSettings }): BookingConfig & { engine: string } {
  const p = getPreset(t.industry);
  return { ...p.booking, ...(t.settings.booking ?? {}), engine: p.engine } as BookingConfig & { engine: string };
}

type Busy = { resourceId: string; startAt: Date; endAt: Date };
async function busyBetween(tid: string, resourceIds: string[], from: Date, to: Date): Promise<Busy[]> {
  if (!resourceIds.length) return [];
  return db
    .select({ resourceId: V.resourceId, startAt: V.startAt, endAt: V.endAt })
    .from(V)
    .where(and(eq(V.tenantId, tid), inArray(V.resourceId, resourceIds), inArray(V.status, [...ACTIVE]), lt(V.startAt, to), gt(V.endAt, from)));
}
const overlaps = (b: Busy[], rid: string, s: Date, e: Date) => b.some((x) => x.resourceId === rid && x.startAt < e && x.endAt > s);

async function activeResources(tid: string, kinds: string[]) {
  return db
    .select()
    .from(R)
    .where(and(eq(R.tenantId, tid), inArray(R.kind, kinds), eq(R.isActive, true)))
    .orderBy(asc(R.sortOrder), asc(R.name));
}

export async function getItem(tid: string, itemId: string) {
  const [it] = await db
    .select()
    .from(schema.catalogItems)
    .where(and(eq(schema.catalogItems.id, itemId), eq(schema.catalogItems.tenantId, tid), eq(schema.catalogItems.isActive, true)));
  if (!it) throw new ApiError(404, "Không tìm thấy dịch vụ / loại phòng");
  return it;
}

/* ═════════════ Engine SLOTS: dịch vụ có thời lượng ═════════════ */
export async function slotAvailability(t: { id: string; industry: string; settings: schema.TenantSettings }, itemId: string, date: string, staffId?: string | null) {
  const cfg = bookingConfig(t);
  const item = await getItem(t.id, itemId);
  const dur = item.durationMin || cfg.durationMin || 60;
  const staff = (await activeResources(t.id, ["staff"])).filter((s) => !staffId || s.id === staffId);
  const beds = cfg.needsBed ? await activeResources(t.id, ["bed"]) : [];
  const dayStart = vnDate(date, cfg.open);
  const dayEnd = vnDate(date, cfg.close);
  const busy = await busyBetween(t.id, [...staff.map((s) => s.id), ...beds.map((b) => b.id)], dayStart, dayEnd);
  const minStart = Date.now() + 30 * 60_000; // đặt trước ít nhất 30 phút
  const slots: { time: string; available: boolean; staffIds: string[] }[] = [];
  for (let m = toMin(cfg.open); m + dur <= toMin(cfg.close); m += cfg.step) {
    const s = vnDate(date, fromMin(m));
    const e = new Date(s.getTime() + dur * 60_000);
    const freeStaff = staff.filter((x) => !overlaps(busy, x.id, s, e)).map((x) => x.id);
    const bedOk = !cfg.needsBed || beds.some((b) => !overlaps(busy, b.id, s, e));
    slots.push({ time: fromMin(m), available: s.getTime() >= minStart && freeStaff.length > 0 && bedOk, staffIds: freeStaff });
  }
  return { item: { id: item.id, name: item.name, price: item.price, durationMin: dur }, staff: staff.map((s) => ({ id: s.id, name: s.name })), slots };
}

/* ═════════════ Engine TABLES: bàn theo giờ đến ═════════════ */
export async function tableAvailability(t: { id: string; industry: string; settings: schema.TenantSettings }, date: string, time: string, party: number) {
  const cfg = bookingConfig(t);
  const s = vnDate(date, time);
  const e = new Date(s.getTime() + cfg.durationMin * 60_000);
  const tables = await activeResources(t.id, ["table"]);
  const busy = await busyBetween(t.id, tables.map((x) => x.id), s, e);
  return {
    durationMin: cfg.durationMin,
    tables: tables.map((x) => ({
      id: x.id,
      name: x.name,
      area: x.area ?? "Khu chính",
      capacity: x.capacity,
      x: x.x,
      y: x.y,
      shape: x.shape,
      free: !overlaps(busy, x.id, s, e),
      fits: x.capacity >= party,
    })),
  };
}

export function timeOptions(cfg: BookingConfig, minLeadMin = 30, date?: string) {
  const out: string[] = [];
  const latest = toMin(cfg.close) - Math.min(cfg.durationMin || 60, 60);
  for (let m = toMin(cfg.open); m <= latest; m += cfg.step) {
    const hhmm = fromMin(m);
    if (date && vnDate(date, hhmm).getTime() < Date.now() + minLeadMin * 60_000) continue;
    out.push(hhmm);
  }
  return out;
}

/* ═════════════ Engine ROOMS: loại phòng theo ngày ═════════════ */
export async function roomAvailability(t: { id: string; industry: string; settings: schema.TenantSettings }, checkIn: string, checkOut: string, guests: number) {
  const cfg = bookingConfig(t);
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1 || nights > 30) throw new ApiError(422, "Số đêm phải từ 1 đến 30");
  if (checkIn < vnToday()) throw new ApiError(422, "Ngày nhận phòng đã qua");
  const s = vnDate(checkIn, cfg.open);
  const e = vnDate(checkOut, cfg.close);
  const rooms = await activeResources(t.id, ["room"]);
  const busy = await busyBetween(t.id, rooms.map((r) => r.id), s, e);
  const types = await db
    .select()
    .from(schema.catalogItems)
    .where(and(eq(schema.catalogItems.tenantId, t.id), eq(schema.catalogItems.isActive, true)))
    .orderBy(asc(schema.catalogItems.sortOrder), asc(schema.catalogItems.price));
  return {
    nights,
    types: types
      .map((ty) => {
        const ofType = rooms.filter((r) => r.itemId === ty.id);
        const free = ofType.filter((r) => !overlaps(busy, r.id, s, e));
        return { id: ty.id, name: ty.name, description: ty.description, imageUrl: ty.imageUrl, tags: ty.tags, capacity: ty.capacity ?? 2, price: ty.price, total: ty.price * nights, rooms: ofType.length, free: free.length, freeRoomIds: free.map((r) => r.id), fits: (ty.capacity ?? 2) >= guests };
      })
      .filter((x) => x.rooms > 0),
  };
}

/** Lỗi vi phạm EXCLUDE (23P01) => đã có người vừa đặt trùng */
export function isOverlapError(e: unknown) {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23P01" || err?.cause?.code === "23P01";
}

/** Chọn tài nguyên trống đầu tiên (ưu tiên sức chứa nhỏ nhất vừa đủ). */
export async function pickFreeResource(tid: string, kinds: string[], s: Date, e: Date, opts: { minCapacity?: number; itemId?: string; only?: string } = {}) {
  let list = await activeResources(tid, kinds);
  if (opts.only) list = list.filter((r) => r.id === opts.only);
  if (opts.itemId) list = list.filter((r) => r.itemId === opts.itemId);
  if (opts.minCapacity) list = list.filter((r) => r.capacity >= opts.minCapacity!).sort((a, b) => a.capacity - b.capacity);
  const busy = await busyBetween(tid, list.map((r) => r.id), s, e);
  return list.find((r) => !overlaps(busy, r.id, s, e)) ?? null;
}
