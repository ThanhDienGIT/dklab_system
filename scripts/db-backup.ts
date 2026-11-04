/**
 * Sao lưu TOÀN BỘ dữ liệu ra 1 file JSON nén (không cần cài pg_dump, chạy được với Neon/Supabase/RDS…).
 *   npm run db:backup                       # → backups/backup-YYYYMMDD-HHmm.json.gz
 *   npm run db:backup -- my-file.json.gz
 * Bỏ qua bảng sessions (phiên đăng nhập) — sau khi khôi phục người dùng chỉ cần đăng nhập lại.
 * ⚠️ File chứa hash mật khẩu & thông tin MISA đã mã hóa bằng APP_SECRET: giữ bí mật, khôi phục với cùng APP_SECRET.
 */
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { resolveDatabaseUrl } from "../src/lib/db/url";
import { mask, open, tablesInFkOrder } from "./lib/pg";

export const SKIP_TABLES = new Set(["sessions"]);
const CHUNK = 2000;

const url = resolveDatabaseUrl();
if (!url) {
  console.error("✗ Thiếu DATABASE_URL");
  process.exit(1);
}

const stamp = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "-")
  .slice(0, 13);
const file = process.argv[2] || `backups/backup-${stamp}.json.gz`;

async function main() {
  const conn = open(url!);
  console.log(`→ Sao lưu ${mask(url!)}`);
  mkdirSync(dirname(file), { recursive: true });
  // 1 snapshot nhất quán dù ứng dụng vẫn đang ghi dữ liệu
  await conn.begin("isolation level repeatable read read only", async (sql) => {
    const tables = (await tablesInFkOrder(sql)).filter(
      (t) => !SKIP_TABLES.has(t),
    );
    const [{ ver }] =
      await sql`select current_setting('server_version') as ver`;
    const migrations =
      await sql`select hash, created_at from drizzle.__drizzle_migrations order by id`.catch(
        () => [],
      );

    async function* gen() {
      yield `{"format":"dklab-backup","version":1,"createdAt":${JSON.stringify(new Date().toISOString())},"server":${JSON.stringify(ver)},"migrations":${JSON.stringify(migrations.map((m) => m.hash))},"tables":${JSON.stringify(tables)},"data":{`;
      let first = true;
      for (const t of tables) {
        const [{ n }] = await sql.unsafe(
          `select count(*)::int as n from "${t}"`,
        );
        yield `${first ? "" : ","}${JSON.stringify(t)}:[`;
        first = false;
        for (let off = 0; off < n; off += CHUNK) {
          // to_jsonb giữ nguyên kiểu (jsonb, timestamptz ISO, numeric dạng chuỗi số…)
          const [{ rows }] = await sql.unsafe(
            `select coalesce(json_agg(to_jsonb(__dk_row)), '[]') as rows from (select * from "${t}" order by ctid offset ${off} limit ${CHUNK}) __dk_row`,
          );
          const s = JSON.stringify(rows);
          if (s.length > 2) yield (off ? "," : "") + s.slice(1, -1);
        }
        yield "]";
        console.log(`  ${t.padEnd(24)} ${n}`);
      }
      yield "}}";
    }

    await pipeline(
      Readable.from(gen()),
      createGzip(),
      createWriteStream(file, { mode: 0o600 }),
    );
  });
  await conn.end();
  console.log(`✓ Đã lưu ${file}`);
}

main().catch((e) => {
  console.error("✗", e.message ?? e);
  process.exit(1);
});
