/**
 * Khôi phục file sao lưu vào BẤT KỲ PostgreSQL ≥ 13 nào (server mới, nhà cung cấp khác…).
 *   npm run db:restore -- backups/backup-xxxx.json.gz
 *   npm run db:restore -- file.json.gz --force   # XÓA dữ liệu hiện có của database đích rồi khôi phục
 * Tự tạo database (nếu tài khoản có quyền) + tạo toàn bộ bảng bằng migration, sau đó nạp dữ liệu trong 1 transaction.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { resolveDatabaseUrl } from "../src/lib/db/url";
import {
  ensureDatabase,
  mask,
  open,
  preflight,
  tablesInFkOrder,
} from "./lib/pg";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const force = args.includes("--force");
const url = resolveDatabaseUrl();
if (!url) {
  console.error("✗ Thiếu DATABASE_URL");
  process.exit(1);
}
if (!file) {
  console.error("Cách dùng: npm run db:restore -- <file.json.gz> [--force]");
  process.exit(1);
}

type Backup = {
  format: string;
  version: number;
  createdAt: string;
  tables: string[];
  data: Record<string, Record<string, unknown>[]>;
};
const CHUNK = 500;

async function main() {
  const raw = readFileSync(file!);
  const backup = JSON.parse(
    (file!.endsWith(".gz") ? gunzipSync(raw) : raw).toString("utf8"),
  ) as Backup;
  if (backup.format !== "dklab-backup" || backup.version !== 1)
    throw new Error("File không phải bản sao lưu DKLab hợp lệ");
  console.log(`→ Khôi phục bản ${backup.createdAt} vào ${mask(url!)}`);

  await ensureDatabase(url!);
  const sql = open(url!);
  console.log(`✓ PostgreSQL ${await preflight(sql)}`);
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  console.log("✓ Đã tạo/cập nhật cấu trúc bảng");

  const tables = await tablesInFkOrder(sql);
  const unknown = backup.tables.filter((t) => !tables.includes(t));
  if (unknown.length)
    throw new Error(
      `Bản sao lưu có bảng không tồn tại trong mã nguồn hiện tại: ${unknown.join(", ")} — hãy dùng phiên bản mã nguồn mới hơn`,
    );

  const busy = [];
  for (const t of tables) {
    const [r] = await sql.unsafe(`select exists(select 1 from "${t}") as x`);
    if (r.x) busy.push(t);
  }
  if (busy.length && !force)
    throw new Error(
      `Database đích đã có dữ liệu (${busy.join(", ")}). Dùng database trống, hoặc thêm --force để XÓA và ghi đè.`,
    );

  await sql.begin(async (tx) => {
    if (busy.length) {
      await tx.unsafe(
        `TRUNCATE ${tables.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
      );
      console.log("  (đã xóa dữ liệu cũ)");
    }
    for (const t of tables) {
      const rows = backup.data[t] ?? [];
      for (let i = 0; i < rows.length; i += CHUNK) {
        // json_populate_recordset tự ép kiểu theo định nghĩa bảng đích (jsonb, timestamptz, numeric, enum…)
        await tx.unsafe(
          `insert into "${t}" select * from json_populate_recordset(null::"${t}", $1::text::json)`,
          [JSON.stringify(rows.slice(i, i + CHUNK))],
        );
      }
      if (rows.length) console.log(`  ${t.padEnd(24)} ${rows.length}`);
    }
    // Đồng bộ sequence cho cột serial/identity (nếu có)
    const seqs = await tx`
      select c.relname as tbl, a.attname as col, pg_get_serial_sequence(quote_ident(c.relname), a.attname) as seq
      from pg_class c join pg_namespace n on n.oid = c.relnamespace join pg_attribute a on a.attrelid = c.oid
      where n.nspname = 'public' and c.relkind = 'r' and a.attnum > 0 and pg_get_serial_sequence(quote_ident(c.relname), a.attname) is not null`;
    for (const s of seqs)
      await tx.unsafe(
        `select setval('${s.seq}', coalesce((select max("${s.col}") from "${s.tbl}"), 0) + 1, false)`,
      );
  });
  await sql.end();
  console.log(
    "✓ Khôi phục xong. Nhớ đặt APP_SECRET giống server cũ (để giải mã cấu hình MISA). Người dùng cần đăng nhập lại.",
  );
}

main().catch((e) => {
  console.error("✗", e.message ?? e);
  process.exit(1);
});
