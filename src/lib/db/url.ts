/**
 * Tìm chuỗi kết nối Postgres từ biến môi trường.
 * Vercel/Neon có thể đặt tên khác nhau tùy cách Connect (có prefix tùy chỉnh):
 * DATABASE_URL, POSTGRES_URL, <PREFIX>_DATABASE_URL, <PREFIX>_POSTGRES_URL…
 * Dùng chung cho app, script migrate và drizzle-kit (không import "server-only").
 */
const PREFERRED = ["DATABASE_URL", "POSTGRES_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "POSTGRES_PRISMA_URL", "NEON_DATABASE_URL"];

const isPg = (v?: string) => !!v && /^postgres(ql)?:\/\//i.test(v.trim());

/**
 * postgres.js gửi mọi tham số lạ trên URL thẳng tới server như "configuration parameter"
 * => Postgres từ chối: unrecognized configuration parameter "channel_binding".
 * Neon/Prisma thêm sẵn channel_binding, pgbouncer, schema… nên phải bỏ đi.
 * (sslmode, connect_timeout được postgres.js hiểu nên giữ nguyên; kết nối vẫn mã hóa TLS.)
 */
const UNSUPPORTED_PARAMS = ["channel_binding", "pgbouncer", "schema", "statement_cache_size", "pool_timeout", "connection_limit"];
export function normalizeDatabaseUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    for (const p of UNSUPPORTED_PARAMS) u.searchParams.delete(p);
    return u.toString();
  } catch {
    return raw.trim();
  }
}

export function resolveDatabaseUrl(env: Record<string, string | undefined> = process.env): string | undefined {
  for (const k of PREFERRED) if (isPg(env[k])) return normalizeDatabaseUrl(env[k]!);
  // Có prefix tùy chỉnh: STORAGE_DATABASE_URL, DKLAB_POSTGRES_URL…
  const keys = Object.keys(env).sort();
  for (const suffix of ["_DATABASE_URL", "_POSTGRES_URL"]) {
    const k = keys.find((x) => x.endsWith(suffix) && isPg(env[x]));
    if (k) return normalizeDatabaseUrl(env[k]!);
  }
  return undefined;
}

/** Tên (không có giá trị) các biến trông giống cấu hình DB, để chẩn đoán. */
export function dbEnvNames(env: Record<string, string | undefined> = process.env): string[] {
  return Object.keys(env).filter((k) => /DATABASE|POSTGRES|^PG|NEON/i.test(k)).sort();
}
