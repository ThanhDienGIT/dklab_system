/**
 * Tiện ích quản trị PostgreSQL dùng chung cho các script db:* (chạy bằng tsx, không phụ thuộc Next).
 * Hỗ trợ mọi Postgres ≥ 13: local, Docker, Neon, Supabase, AWS RDS, Google Cloud SQL, VPS…
 */
import postgres from "postgres";

const SAFE_DB = /^[A-Za-z0-9_][A-Za-z0-9_-]{0,62}$/;
export const mask = (url: string) =>
  url.replace(/\/\/([^:/@]+):[^@]*@/, "//$1:***@");

export const open = (url: string) =>
  postgres(url, {
    max: 1,
    prepare: false,
    onnotice: () => {},
    connect_timeout: 15,
  });

/** Database trong chuỗi kết nối chưa tồn tại => kết nối vào DB "postgres" cùng server rồi CREATE DATABASE */
export async function ensureDatabase(url: string) {
  const probe = open(url);
  try {
    await probe`select 1`;
    return false;
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code !== "3D000") throw explain(err);
  } finally {
    await probe.end({ timeout: 2 });
  }
  const u = new URL(url);
  const name = decodeURIComponent(u.pathname.replace(/^\//, ""));
  if (!SAFE_DB.test(name))
    throw new Error(
      `Tên database "${name}" không hợp lệ (chỉ a-z, 0-9, _ , -)`,
    );
  u.pathname = "/postgres";
  const admin = open(u.toString());
  try {
    await admin.unsafe(
      `CREATE DATABASE "${name}" ENCODING 'UTF8' TEMPLATE template0`,
    );
    console.log(`✓ Đã tạo database "${name}"`);
    return true;
  } catch (e) {
    throw new Error(
      `Database "${name}" chưa tồn tại và tài khoản không có quyền tạo (${(e as Error).message}). Hãy tạo database trên trang quản trị nhà cung cấp rồi chạy lại.`,
    );
  } finally {
    await admin.end({ timeout: 2 });
  }
}

/** Kiểm tra phiên bản & extension cần thiết trước khi migrate */
export async function preflight(sql: ReturnType<typeof open>) {
  const [{ v, ver }] =
    await sql`select current_setting('server_version_num')::int as v, current_setting('server_version') as ver`;
  if (v < 130000)
    throw new Error(`Cần PostgreSQL ≥ 13 (server hiện tại: ${ver})`);
  const [ext] =
    await sql`select 1 from pg_available_extensions where name = 'btree_gist'`;
  if (!ext)
    throw new Error(
      "Server thiếu extension btree_gist (dùng để chống đặt trùng). Cài gói postgresql-contrib hoặc bật extension trên trang quản trị nhà cung cấp.",
    );
  return ver as string;
}

function explain(err: { code?: string; message?: string }): Error {
  const m = err.message ?? String(err);
  if (err.code === "28P01")
    return new Error(
      "Sai tài khoản / mật khẩu database (kiểm tra DATABASE_URL)",
    );
  if (/ECONNREFUSED|ENOTFOUND|timeout/i.test(m))
    return new Error(
      `Không kết nối được tới server database: ${m}. Kiểm tra host/port, firewall, hoặc bật "allow connections" trên nhà cung cấp.`,
    );
  if (/SSL|ssl/.test(m))
    return new Error(
      `Lỗi SSL: ${m}. Thử thêm ?sslmode=require vào DATABASE_URL (Neon/Supabase/RDS).`,
    );
  return new Error(m);
}

/** Bảng của ứng dụng theo thứ tự phụ thuộc khóa ngoại (cha trước, con sau) */
export async function tablesInFkOrder(
  sql: ReturnType<typeof open> | postgres.TransactionSql,
): Promise<string[]> {
  const tables = (
    await sql`select tablename from pg_tables where schemaname = 'public' order by tablename`
  ).map((r) => r.tablename as string);
  const edges = await sql`
    select c.conrelid::regclass::text as child, c.confrelid::regclass::text as parent
    from pg_constraint c join pg_namespace n on n.oid = c.connamespace
    where c.contype = 'f' and n.nspname = 'public'`;
  const deps = new Map(tables.map((t) => [t, new Set<string>()]));
  for (const e of edges) {
    const child = String(e.child).replace(/"/g, "");
    const parent = String(e.parent).replace(/"/g, "");
    if (child !== parent) deps.get(child)?.add(parent);
  }
  const out: string[] = [];
  const seen = new Set<string>();
  const visit = (t: string, stack = new Set<string>()) => {
    if (seen.has(t)) return;
    if (stack.has(t)) throw new Error(`Vòng phụ thuộc khóa ngoại tại ${t}`);
    stack.add(t);
    for (const p of deps.get(t) ?? []) visit(p, stack);
    seen.add(t);
    out.push(t);
  };
  for (const t of tables) visit(t);
  return out;
}
