/**
 * Kiểm thử bảo mật qua HTTP (chạy trên server đang chạy).
 *   BASE_URL=http://localhost:3100 npx tsx scripts/security-test.ts
 * Tự tạo tenant "secb_test" (doanh nghiệp B) để thử tấn công chéo tenant.
 * Mỗi test in PASS khi tấn công BỊ CHẶN.
 */
import { hash } from "@node-rs/argon2";
import postgres from "postgres";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const sql = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
const ORIGIN = new URL(BASE).origin;
const PW = "Admin@123";

type Res = { status: number; json: { ok?: boolean; data?: Record<string, unknown> & { id?: string }; error?: string } | null; headers: Headers; text: string };
class Client {
  cookies = new Map<string, string>();
  constructor(public ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`) {}
  async req(method: string, path: string, body?: unknown, extra: Record<string, string> = {}): Promise<Res> {
    const h: Record<string, string> = { origin: ORIGIN, "x-real-ip": this.ip, ...extra };
    if (body !== undefined && !("content-type" in h)) h["content-type"] = "application/json";
    if (this.cookies.size) h.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    const r = await fetch(BASE + path, { method, headers: h, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body), redirect: "manual" });
    for (const c of r.headers.getSetCookie()) {
      const [kv] = c.split(";");
      const i = kv.indexOf("=");
      const v = kv.slice(i + 1);
      if (v) this.cookies.set(kv.slice(0, i), v);
      else this.cookies.delete(kv.slice(0, i));
    }
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: r.status, json, headers: r.headers, text };
  }
  login(identifier: string, tenant = "dulich_demo") {
    return this.req("POST", "/api/auth/login", { identifier, password: PW }, { cookie: `dk_tenant=${tenant}` });
  }
}

let pass = 0, fail = 0;
function check(name: string, ok: boolean, info = "") {
  if (ok) pass++; else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? `  (${info})` : ""}`);
}
const blocked = (r: Res) => r.status >= 400 && r.status < 500;

async function setupTenantB() {
  const [ex] = await sql`select id from tenants where slug = 'secb_test'`;
  if (ex) await sql`delete from tenants where id = ${ex.id}`;
  const [t] = await sql`insert into tenants (slug, name, industry, settings) values ('secb_test', 'Doanh nghiệp B', 'travel', '{}'::jsonb) returning id`;
  const [role] = await sql`insert into roles (tenant_id, key, name, permissions, is_system) values (${t.id}, 'owner', 'Chủ', ${["*"]}, true) returning id`;
  const [u] = await sql`insert into users (tenant_id, full_name, email, password_hash) values (${t.id}, 'Chủ B', 'owner@b.test', ${await hash(PW)}) returning id`;
  await sql`insert into user_roles (user_id, role_id) values (${u.id}, ${role.id})`;
  const [tour] = await sql`insert into tours (tenant_id, slug, title, base_price) values (${t.id}, 'tour-b', 'Tour B', 1000000) returning id`;
  const [dep] = await sql`insert into tour_departures (tenant_id, tour_id, depart_date, seats_total) values (${t.id}, ${tour.id}, current_date + 10, 10) returning id`;
  const [cust] = await sql`insert into customers (tenant_id, full_name, phone) values (${t.id}, 'Khách B', '0999999999') returning id`;
  return { tid: t.id as string, ownerId: u.id as string, tourId: tour.id as string, depId: dep.id as string, custId: cust.id as string };
}

async function main() {
  const B = await setupTenantB();
  await sql`delete from users where email in ('hr@dulichdemo.vn','victim@dulichdemo.vn','fakemgr@dulichdemo.vn')`;
  await sql`delete from roles where name in ('HR test', 'HR test 2')`;
  await sql`delete from tenant_domains where domain in ('secb-test.dklab.vn','evil-unverified.test')`;
  await sql`update users set failed_logins = 0, locked_until = null`;

  const owner = new Client();
  check("setup: owner A đăng nhập", (await owner.login("admin@dulichdemo.vn")).status === 200);
  const rec = new Client();
  check("setup: lễ tân A đăng nhập", (await rec.login("letan@dulichdemo.vn")).status === 200);

  console.log("\n— 1. Chiếm domain");
  let r = await owner.req("POST", "/api/v1/domains", { domain: "secb-test.dklab.vn" });
  check("Không cho thêm subdomain của ROOT_DOMAIN", blocked(r), `${r.status} ${r.json?.error ?? ""}`);
  r = await owner.req("POST", "/api/v1/domains", { domain: "evil-unverified.test" });
  // fetch() không cho đặt Host => dùng http.request
  const { request } = await import("node:http");
  const body: string = await new Promise((res, rej) => {
    const u = new URL(BASE);
    request({ host: u.hostname, port: u.port, path: "/", headers: { host: "evil-unverified.test" } }, (rs) => {
      let d = "";
      rs.on("data", (c) => (d += c));
      rs.on("end", () => res(d));
    }).on("error", rej).end();
  });
  const siteLeaked = body.includes("Tour đang mở bán") || body.includes("ha-long-du-thuyen");
  check("Domain chưa xác minh DNS không hiển thị website doanh nghiệp", !siteLeaked && body.includes("404"), `thêm=${r.status}`);

  console.log("\n— 2. MISA SSRF / lộ mật khẩu");
  const cur = await owner.req("GET", "/api/v1/settings");
  const s = cur.json!.data!.settings as Record<string, unknown>;
  const base = { name: "Du Lịch Demo", brand: s.brand, contact: s.contact, company: s.company, invoice: s.invoice, bankAccounts: s.bankAccounts };
  r = await owner.req("PUT", "/api/v1/settings", { ...base, misa: { enabled: true, env: "test", appId: "x", taxCode: "0312345678", username: "u", password: "p", baseUrl: "http://127.0.0.1:9/" } });
  check("Chặn Base URL MISA ngoài *.meinvoice.vn", blocked(r), `${r.status} ${r.json?.error ?? ""}`);
  r = await owner.req("PUT", "/api/v1/settings", { ...base, misa: { enabled: true, env: "test", appId: "x", taxCode: "0312345678", username: "u", password: "secret-pass" } });
  r = await owner.req("PUT", "/api/v1/settings", { ...base, misa: { enabled: true, env: "test", appId: "x", taxCode: "0312345678", username: "attacker" } });
  const after = await owner.req("GET", "/api/v1/settings");
  const misa = (after.json!.data!.settings as { misa?: { hasPassword?: boolean } }).misa;
  check("Đổi tài khoản MISA mà không nhập lại mật khẩu → mật khẩu cũ bị xóa", misa?.hasPassword === false, `hasPassword=${misa?.hasPassword}`);
  await owner.req("PUT", "/api/v1/settings", { ...base, misa: { enabled: true, env: "mock", invSeries: "1C26TDL", withCode: true } });
  r = await owner.req("PUT", "/api/v1/settings", { ...base, brand: { primaryColor: "red;background:url(//evil)", heroImage: "javascript:alert(1)" } });
  check("Chặn màu / URL ảnh độc hại", blocked(r), `${r.status}`);

  console.log("\n— 3 & 5. Tấn công chéo tenant bằng ID");
  const [tourA] = await sql`select id from tours where slug = 'ha-long-du-thuyen-2n1d'`;
  r = await rec.req("POST", "/api/v1/bookings", { resourceType: "tour", resourceId: tourA.id, slotId: B.depId, fullName: "Hacker", phone: "0911111111", adults: 5 });
  let seats = (await sql`select seats_booked from tour_departures where id = ${B.depId}`)[0].seats_booked;
  if (r.status === 200) {
    await rec.req("PATCH", `/api/v1/bookings/${r.json!.data!.id}`, { status: "confirmed" });
    seats = (await sql`select seats_booked from tour_departures where id = ${B.depId}`)[0].seats_booked;
  }
  check("Không dùng được slotId của tenant khác / không sửa được số chỗ của B", blocked(r) && seats === 0, `${r.status}, seats B=${seats}`);
  r = await rec.req("POST", "/api/v1/bookings", { resourceType: "tour", fullName: "Khách X", phone: "0911111112" });
  check("setup: tạo đặt chỗ hợp lệ", r.status === 200, `${r.status} ${r.json?.error ?? ""}`);
  r = await rec.req("PATCH", `/api/v1/bookings/${r.json?.data?.id}`, { assignedTo: B.ownerId });
  check("Không gán đặt chỗ cho user của tenant khác", blocked(r), `${r.status}`);
  r = await rec.req("POST", "/api/v1/invoices", { customerId: B.custId, buyerName: "X", items: [{ itemName: "a", unit: "c", quantity: 1, unitPrice: 1, vatRate: 8 }] });
  check("Không lập hóa đơn gắn khách của tenant khác", blocked(r), `${r.status}`);
  r = await owner.req("POST", "/api/v1/employees", { code: "X1", fullName: "Nhân viên X", userId: B.ownerId });
  check("Không liên kết nhân viên với tài khoản tenant khác", blocked(r), `${r.status}`);

  r = await rec.req("GET", "/api/v1/bookings/not-a-uuid");
  check("ID sai định dạng trả 404 (không lộ lỗi SQL)", r.status === 404, `${r.status}`);

  console.log("\n— 4. Leo thang đặc quyền");
  r = await owner.req("POST", "/api/v1/roles", { name: "HR test", permissions: ["users.manage", "dashboard.view"] });
  const hrRole = r.json!.data!.id as string;
  const { json: ul } = await owner.req("GET", "/api/v1/users");
  const roles = (ul!.data!.roles as { id: string; key: string }[]);
  const ownerRole = roles.find((x) => x.key === "owner")!.id;
  const managerRole = roles.find((x) => x.key === "manager")!.id;
  const ownerUser = (ul!.data!.items as { id: string; email: string }[]).find((u) => u.email === "admin@dulichdemo.vn")!.id;
  await owner.req("POST", "/api/v1/users", { fullName: "HR", email: "hr@dulichdemo.vn", password: PW, roleIds: [hrRole] });
  const hr = new Client();
  check("setup: HR (users.manage) đăng nhập", (await hr.login("hr@dulichdemo.vn")).status === 200);
  r = await hr.req("PATCH", `/api/v1/users/${ownerUser}`, { password: "Hacked123" });
  check("HR không đặt lại được mật khẩu của Chủ", blocked(r), `${r.status} ${r.json?.error ?? ""}`);
  r = await hr.req("POST", "/api/v1/users", { fullName: "Fake owner", email: "victim@dulichdemo.vn", password: PW, roleIds: [ownerRole] });
  check("HR không tạo được tài khoản vai trò Chủ", blocked(r), `${r.status}`);
  r = await hr.req("POST", "/api/v1/users", { fullName: "Fake mgr", email: "fakemgr@dulichdemo.vn", password: PW, roleIds: [managerRole] });
  check("HR không gán được vai trò có quyền vượt quyền mình", blocked(r), `${r.status}`);
  r = await hr.req("POST", "/api/v1/roles", { name: "HR test 2", permissions: ["settings.manage"] });
  check("HR không tạo được vai trò có quyền mình không có", blocked(r), `${r.status}`);

  console.log("\n— 6. CSRF");
  r = await owner.req("POST", "/api/v1/customers", { fullName: "CSRF", phone: "0922222222" }, { origin: "https://evil.dklab.vn" });
  check("Chặn request khác Origin", r.status === 403, `${r.status}`);
  r = await owner.req("POST", "/api/v1/customers", JSON.stringify({ fullName: "CSRF2", phone: "0922222223" }), { "content-type": "text/plain" });
  check("Chặn body không phải application/json", r.status === 415, `${r.status}`);

  console.log("\n— 7. Thu hồi quyền tức thì");
  const victim = new Client();
  await owner.req("POST", "/api/v1/users", { fullName: "Victim", email: "victim@dulichdemo.vn", password: PW, roleIds: [managerRole] });
  await victim.login("victim@dulichdemo.vn");
  const vid = ((await owner.req("GET", "/api/v1/users")).json!.data!.items as { id: string; email: string }[]).find((u) => u.email === "victim@dulichdemo.vn")!.id;
  check("setup: user bị khóa đọc được trước khi khóa", (await victim.req("GET", "/api/v1/customers")).status === 200);
  await owner.req("PATCH", `/api/v1/users/${vid}`, { status: "disabled" });
  r = await victim.req("GET", "/api/v1/customers");
  check("Khóa tài khoản → access token bị từ chối ngay", r.status === 401, `${r.status}`);
  const lo = new Client();
  await lo.login("ketoan@dulichdemo.vn");
  const at = lo.cookies.get("dk_at")!;
  await lo.req("POST", "/api/auth/logout");
  r = await new Client().req("GET", "/api/v1/invoices", undefined, { authorization: `Bearer ${at}` });
  check("Đăng xuất → access token cũ hết hiệu lực", r.status === 401, `${r.status}`);

  console.log("\n— 8. Brute force / spam");
  const bf = new Client();
  let st = 0;
  for (let i = 0; i < 25; i++) st = (await bf.req("POST", "/api/auth/login", { identifier: `nobody${i}@x.vn`, password: "x" }, { cookie: "dk_tenant=dulich_demo" })).status;
  check("Giới hạn số lần đăng nhập theo IP", st === 429, `${st}`);
  const sp = new Client();
  for (let i = 0; i < 8; i++) st = (await sp.req("POST", "/api/public/bookings", { resourceType: "service", fullName: "Spam bot", phone: `09333333${10 + i}`, consent: true })).status;
  check("Giới hạn form đặt chỗ theo IP", st === 429, `${st}`);

  console.log("\n— 9/10. Cấu hình");
  const lg = await fetch(BASE + "/login");
  const html = await lg.text();
  const chunks = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]);
  let leaked = html.includes("admin@dulichdemo.vn");
  for (const c of chunks) if ((await (await fetch(BASE + c)).text()).includes("admin@dulichdemo.vn")) leaked = true;
  check("Không lộ tài khoản demo (HTML + JS) khi DEMO_MODE tắt", process.env.DEMO_MODE === "1" || !leaked, `${chunks.length} file JS`);
  check("Header chống clickjacking", (lg.headers.get("x-frame-options") ?? "").toUpperCase() === "DENY");
  check("Có Content-Security-Policy", !!lg.headers.get("content-security-policy"));
  check("Có X-Content-Type-Options", lg.headers.get("x-content-type-options") === "nosniff");

  // dọn dẹp
  await sql`delete from tenants where slug = 'secb_test'`;
  await sql`delete from users where email in ('hr@dulichdemo.vn','victim@dulichdemo.vn','fakemgr@dulichdemo.vn')`;
  await sql`delete from roles where name in ('HR test', 'HR test 2')`;
  await sql`delete from tenant_domains where domain in ('secb-test.dklab.vn','evil-unverified.test')`;
  await sql`delete from booking_requests where full_name in ('Hacker','Khách X','Spam bot')`;
  await sql`delete from customers where full_name in ('Hacker','X','CSRF','CSRF2','Spam bot')`;
  await sql`delete from employees where code = 'X1'`;
  await sql`update users set failed_logins = 0, locked_until = null`;
  console.log(`\n${pass} PASS, ${fail} FAIL`);
  await sql.end();
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
