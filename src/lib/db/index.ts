import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __pg?: ReturnType<typeof postgres> };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Thiếu DATABASE_URL. Xem .env.example");
  // prepare:false để chạy được qua connection pooler (Neon/Supabase PgBouncer) trên Vercel.
  return postgres(url, { max: process.env.NODE_ENV === "production" ? 5 : 10, prepare: false });
}

const client = globalForDb.__pg ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.__pg = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export type DB = typeof db;
export { schema };
