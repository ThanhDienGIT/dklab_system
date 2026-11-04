import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { resolveDatabaseUrl } from "./url";

const globalForDb = globalThis as unknown as { __pg?: ReturnType<typeof postgres> };

function make() {
  const url = resolveDatabaseUrl();
  if (!url) throw new Error("Thiếu DATABASE_URL. Xem .env.example hoặc mở /api/health");
  // prepare:false để chạy được qua connection pooler (Neon/Supabase PgBouncer) trên Vercel.
  const client = globalForDb.__pg ?? postgres(url, { max: process.env.NODE_ENV === "production" ? 5 : 10, prepare: false });
  if (process.env.NODE_ENV !== "production") globalForDb.__pg = client;
  return drizzle(client, { schema, casing: "snake_case" });
}

export type DB = ReturnType<typeof make>;

/**
 * Kết nối được tạo ở truy vấn đầu tiên (lazy), không phải lúc nạp module
 * => `next build` chạy được cả khi chưa gắn database.
 */
let instance: DB | null = null;
export const db = new Proxy({} as DB, {
  get(_t, prop) {
    instance ??= make();
    const v = Reflect.get(instance, prop, instance);
    return typeof v === "function" ? v.bind(instance) : v;
  },
});
export { schema };
