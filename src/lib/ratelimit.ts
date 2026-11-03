import "server-only";
/**
 * Giới hạn tần suất (fixed window).
 *  - Có UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN => dùng Redis (đúng trên mọi instance serverless)
 *  - Không có => bộ nhớ trong process (chỉ đúng trên 1 instance, đủ cho dev / VPS 1 máy)
 */

type Result = { ok: boolean; remaining: number; resetSec: number };

const mem = new Map<string, { n: number; exp: number }>();
const MAX_KEYS = 50_000;

function memoryHit(key: string, windowSec: number): { n: number; exp: number } {
  const now = Date.now();
  if (mem.size > MAX_KEYS) {
    for (const [k, v] of mem) if (v.exp < now) mem.delete(k);
    if (mem.size > MAX_KEYS) mem.clear(); // chống tràn bộ nhớ khi bị tấn công nhiều key
  }
  const cur = mem.get(key);
  if (!cur || cur.exp < now) {
    const v = { n: 1, exp: now + windowSec * 1000 };
    mem.set(key, v);
    return v;
  }
  cur.n++;
  return cur;
}

async function redisHit(key: string, windowSec: number): Promise<{ n: number; exp: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const r = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, String(windowSec), "NX"], ["TTL", key]]),
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    const [[, n], , [, ttl]] = (await r.json()).map((x: { result: number }) => [null, x.result]);
    return { n: Number(n), exp: Date.now() + Number(ttl) * 1000 };
  } catch {
    return null; // Redis lỗi => rơi về bộ nhớ, không chặn người dùng thật
  }
}

export async function rateLimit(key: string, max: number, windowSec: number): Promise<Result> {
  const k = `rl:${key}`;
  const hit = (await redisHit(k, windowSec)) ?? memoryHit(k, windowSec);
  return { ok: hit.n <= max, remaining: Math.max(0, max - hit.n), resetSec: Math.ceil((hit.exp - Date.now()) / 1000) };
}

/** Xóa bộ đếm (vd: đăng nhập đúng thì reset bộ đếm theo tài khoản) */
export async function resetLimit(key: string) {
  mem.delete(`rl:${key}`);
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) await fetch(`${url}/del/rl:${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
}
