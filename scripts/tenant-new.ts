/**
 * Tạo 1 doanh nghiệp thuộc ngành bất kỳ từ dòng lệnh (không cần đăng nhập Super Admin).
 *   npm run tenant:new -- --industry spa --slug spa_hoasen --name "Spa Hoa Sen" \
 *     --email chu@spahoasen.vn --password 'MatKhau123' [--owner "Nguyễn Thị A"] [--phone 09xx] \
 *     [--address "..."] [--domain spahoasen.vn,www.spahoasen.vn] [--plan pro]
 *   npm run tenant:new -- --list          # liệt kê ngành có sẵn
 */
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/lib/db/schema";
import { resolveDatabaseUrl } from "../src/lib/db/url";
import { INDUSTRY_PRESETS } from "../src/modules/presets";
import { ensureDatabase, mask, open } from "./lib/pg";
import { ensureTenant, validateTenant, type TenantOpts } from "./lib/tenant";

const argv = process.argv.slice(2);
const arg = (k: string) => {
  const i = argv.indexOf(`--${k}`);
  if (i >= 0) return argv[i + 1];
  return argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
};

if (argv.includes("--list") || argv.includes("--help") || !argv.length) {
  console.log("Ngành có sẵn (--industry):");
  for (const p of INDUSTRY_PRESETS) console.log(`  ${p.key.padEnd(12)} ${p.name} — ${p.description}`);
  console.log('\nVí dụ: npm run tenant:new -- --industry spa --slug spa_hoasen --name "Spa Hoa Sen" --email chu@spahoasen.vn --password MatKhau123');
  process.exit(0);
}

const o: TenantOpts = {
  slug: arg("slug") ?? "",
  name: arg("name") ?? "",
  industry: arg("industry") ?? "",
  plan: arg("plan"),
  ownerName: arg("owner"),
  email: arg("email") ?? "",
  password: arg("password") ?? "",
  phone: arg("phone"),
  address: arg("address"),
  domains: (arg("domain") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
};
const errors = validateTenant(o);
if (errors.length) {
  console.error(`✗ Thiếu / sai tham số:\n  - ${errors.join("\n  - ")}\n(xem: npm run tenant:new -- --help)`);
  process.exit(1);
}
const url = resolveDatabaseUrl();
if (!url) {
  console.error("✗ Thiếu DATABASE_URL");
  process.exit(1);
}

(async () => {
  console.log(`→ Database: ${mask(url)}`);
  await ensureDatabase(url);
  const client = open(url);
  try {
    const [{ t }] = await client`select to_regclass('public.tenants') is not null as t`;
    if (!t) throw new Error("Chưa có bảng — chạy `npm run db:setup` trước");
    await ensureTenant(drizzle(client, { schema }), o);
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error("✗", e.message ?? e);
  process.exit(1);
});
