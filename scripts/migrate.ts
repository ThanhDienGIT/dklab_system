/**
 * Chạy migration + seed dữ liệu demo (idempotent).
 * Tự chạy trong `npm run build` (Vercel) nếu có DATABASE_URL.
 *   npm run db:migrate          # migrate + seed
 *   SEED=0 npm run db:migrate   # chỉ migrate (không tạo dữ liệu demo)
 * Triển khai 1 ngành: đặt TENANT_SLUG, TENANT_NAME, TENANT_INDUSTRY, OWNER_EMAIL, OWNER_PASSWORD
 * (+ TENANT_DOMAINS, TENANT_PLAN, OWNER_NAME, OWNER_PHONE, TENANT_ADDRESS) => tự tạo doanh nghiệp lần đầu.
 */
import { hash } from "@node-rs/argon2";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import * as schema from "../src/lib/db/schema";
import { DEFAULT_ROLES, getPreset } from "../src/modules/presets";
import { dbEnvNames, resolveDatabaseUrl } from "../src/lib/db/url";
import { DEMO_SEEDS } from "../src/plugins/_seeds";
import type { DemoSeed } from "../src/plugins/types";
import { tasksBetween } from "../src/lib/services/tax";
import { ensureDatabase, mask, open, preflight } from "./lib/pg";
import { ensureTenant, tenantFromEnv } from "./lib/tenant";
import { INDUSTRY_PRESETS } from "../src/modules/presets";
import { sitePlugins, TRAVEL_DEMO_SLUG } from "../src/site.config";

const url = resolveDatabaseUrl();
if (!url) {
  const names = dbEnvNames();
  console.warn("⚠️  Bỏ qua migrate: chưa có DATABASE_URL");
  console.warn(`   VERCEL_ENV=${process.env.VERCEL_ENV ?? "(không phải Vercel)"} · nhánh=${process.env.VERCEL_GIT_COMMIT_REF ?? "?"}`);
  console.warn(names.length ? `   Biến liên quan DB tìm thấy (không có chuỗi postgres:// hợp lệ): ${names.join(", ")}` : "   Không thấy biến DB nào: database chưa được Connect cho môi trường này.");
  process.exit(0);
}
console.log(`→ Database: ${mask(url)} (${process.env.VERCEL_ENV ?? "local"})`);

const client = open(url);
const db = drizzle(client, { schema });

const days = (n: number) => new Date(Date.now() + n * 86400_000).toISOString().slice(0, 10);

async function seedTenant() {
  const slug = TRAVEL_DEMO_SLUG;
  const [exists] = await db.select({ id: schema.tenants.id }).from(schema.tenants).where(eq(schema.tenants.slug, slug));
  if (exists) {
    console.log(`✓ Tenant "${slug}" đã tồn tại, bỏ qua seed`);
    return;
  }
  console.log(`→ Seed tenant demo "${slug}"`);
  const preset = getPreset("travel");
  const password = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
  const pw = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

  await db.transaction(async (tx) => {
    const [t] = await tx
      .insert(schema.tenants)
      .values({
        slug,
        name: "Du Lịch Demo",
        industry: "travel",
        plan: "pro",
        settings: {
          brand: { primaryColor: "#0369a1", tagline: "Hành trình trọn vẹn – Giá minh bạch – Hỗ trợ 24/7" },
          contact: { phone: "0901234567", hotline: "1900 0000", email: "booking@dulichdemo.vn", address: "123 Nguyễn Huệ, Quận 1, TP.HCM", zalo: "0901234567" },
          company: { legalName: "Công ty TNHH Du Lịch Demo", taxCode: "0312345678", address: "123 Nguyễn Huệ, Quận 1, TP.HCM" },
          invoice: { prefix: "DL", defaultVatRate: 8 },
          // Tài khoản minh họa — thay bằng tài khoản thật trong Cài đặt
          bankAccounts: [{ id: "vcb-main", bankBin: "970436", bankName: "Vietcombank", accountNumber: "0123456789", accountName: "CONG TY TNHH DU LICH DEMO", isDefault: true }],
          misa: { enabled: true, env: "mock", invSeries: "1C26TDL", withCode: true },
        },
      })
      .returning();

    await tx.insert(schema.tenantDomains).values([{ tenantId: t.id, domain: "dulich-demo.dklab.vn", isPrimary: true, verifiedAt: new Date() }]);
    await tx.insert(schema.tenantModules).values(preset.modules.map((m) => ({ tenantId: t.id, moduleKey: m })));
    const [branch] = await tx.insert(schema.branches).values({ tenantId: t.id, name: "Văn phòng TP.HCM", address: "123 Nguyễn Huệ, Q.1", phone: "0901234567" }).returning();

    const roles = await tx
      .insert(schema.roles)
      .values(DEFAULT_ROLES.map((r) => ({ tenantId: t.id, key: r.key, name: r.name, description: r.description, permissions: r.permissions, isSystem: true })))
      .returning();
    const roleId = (k: string) => roles.find((r) => r.key === k)!.id;

    const accounts = [
      { fullName: "Nguyễn Văn Chủ", email: "admin@dulichdemo.vn", phone: "0900000001", role: "owner", code: "NV001", position: "Giám đốc" },
      { fullName: "Trần Thị Lễ Tân", email: "letan@dulichdemo.vn", phone: "0900000002", role: "receptionist", code: "NV002", position: "Lễ tân / Sale tour" },
      { fullName: "Lê Văn Kế Toán", email: "ketoan@dulichdemo.vn", phone: "0900000003", role: "accountant", code: "NV003", position: "Kế toán" },
      { fullName: "Phạm Hướng Dẫn", email: "hdv@dulichdemo.vn", phone: "0900000004", role: "staff", code: "NV004", position: "Hướng dẫn viên" },
    ];
    for (const a of accounts) {
      const [u] = await tx.insert(schema.users).values({ tenantId: t.id, fullName: a.fullName, email: a.email, phone: a.phone, passwordHash: pw }).returning();
      await tx.insert(schema.userRoles).values({ userId: u.id, roleId: roleId(a.role) });
      await tx.insert(schema.employees).values({
        tenantId: t.id, branchId: branch.id, userId: u.id, code: a.code, fullName: a.fullName, phone: a.phone, email: a.email,
        position: a.position, department: a.role === "accountant" ? "Kế toán" : "Kinh doanh", startDate: days(-365), baseSalary: 12_000_000,
      });
    }

    const tours = [
      { slug: "ha-long-du-thuyen-2n1d", title: "Hạ Long – Ngủ đêm du thuyền 5 sao", location: "Quảng Ninh", departFrom: "Hà Nội", d: 2, n: 1, price: 2_890_000, child: 2_190_000,
        summary: "Ngắm kỳ quan vịnh Hạ Long, chèo kayak hang Luồn, ngủ đêm trên du thuyền và tập Tai Chi lúc bình minh.",
        highlights: ["Du thuyền 5 sao, cabin ban công", "Chèo kayak hang Luồn", "Lớp nấu ăn trên boong", "Đón trả tận nơi tại Hà Nội"] },
      { slug: "da-nang-hoi-an-ba-na-3n2d", title: "Đà Nẵng – Hội An – Bà Nà Hills", location: "Đà Nẵng", departFrom: "TP.HCM / Hà Nội", d: 3, n: 2, price: 4_590_000, child: 3_490_000,
        summary: "Cầu Vàng Bà Nà, phố cổ Hội An lung linh đèn lồng, biển Mỹ Khê và bán đảo Sơn Trà.",
        highlights: ["Vé cáp treo Bà Nà + buffet trưa", "Thả đèn hoa đăng sông Hoài", "Khách sạn 4★ gần biển", "Xe đưa đón suốt hành trình"] },
      { slug: "phu-quoc-4n3d", title: "Phú Quốc – Grand World – Hòn Thơm", location: "Kiên Giang", departFrom: "TP.HCM", d: 4, n: 3, price: 6_990_000, child: 5_290_000,
        summary: "Cáp treo vượt biển Hòn Thơm, lặn ngắm san hô An Thới, Grand World và hoàng hôn Sunset Town.",
        highlights: ["Cáp treo vượt biển dài nhất thế giới", "Tour 4 đảo + lặn san hô", "Resort 4★ có hồ bơi", "Vé máy bay khứ hồi"] },
      { slug: "sa-pa-fansipan-3n2d", title: "Sa Pa – Chinh phục Fansipan", location: "Lào Cai", departFrom: "Hà Nội", d: 3, n: 2, price: 3_790_000, child: 2_890_000,
        summary: "Nóc nhà Đông Dương, bản Cát Cát, ruộng bậc thang Mường Hoa và chợ đêm Sa Pa.",
        highlights: ["Vé cáp treo Fansipan", "Xe giường nằm cao cấp", "Homestay view thung lũng", "Lẩu cá hồi đặc sản"] },
      { slug: "mien-tay-can-tho-2n1d", title: "Miền Tây – Cần Thơ – Chợ nổi Cái Răng", location: "Cần Thơ", departFrom: "TP.HCM", d: 2, n: 1, price: 1_890_000, child: 1_290_000,
        summary: "Chợ nổi Cái Răng lúc bình minh, vườn trái cây, đờn ca tài tử và bến Ninh Kiều về đêm.",
        highlights: ["Ghe tham quan chợ nổi", "Vườn trái cây ăn thỏa thích", "Đờn ca tài tử Nam Bộ", "Khách sạn 3★ trung tâm"] },
      { slug: "da-lat-3n2d", title: "Đà Lạt – Thành phố ngàn hoa", location: "Lâm Đồng", departFrom: "TP.HCM", d: 3, n: 2, price: 3_290_000, child: 2_490_000,
        summary: "Đồi chè Cầu Đất, thác Datanla, quảng trường Lâm Viên và săn mây Đồi Đa Phú.",
        highlights: ["Săn mây lúc bình minh", "Máng trượt thác Datanla", "Cà phê view đồi chè", "Xe giường nằm khứ hồi"] },
    ];
    let order = 0;
    for (const tour of tours) {
      const [row] = await tx
        .insert(schema.tours)
        .values({
          tenantId: t.id, slug: tour.slug, title: tour.title, summary: tour.summary, location: tour.location, departFrom: tour.departFrom,
          durationDays: tour.d, durationNights: tour.n, basePrice: tour.price, childPrice: tour.child, highlights: tour.highlights, sortOrder: order++,
          description: `${tour.summary}\n\nGiá bao gồm: xe đưa đón, khách sạn/du thuyền theo chương trình, các bữa ăn chính, vé tham quan, hướng dẫn viên, bảo hiểm du lịch.\nGiá không bao gồm: chi phí cá nhân, đồ uống, tiền tip, VAT (nếu xuất hóa đơn).`,
          itinerary: Array.from({ length: tour.d }, (_, i) => ({
            day: `Ngày ${i + 1}`,
            title: i === 0 ? `Khởi hành – ${tour.location}` : i === tour.d - 1 ? "Mua sắm đặc sản – Trở về" : "Khám phá trọn ngày",
            detail: i === 0 ? "Đón khách tại điểm hẹn, di chuyển, nhận phòng và tham quan buổi chiều." : i === tour.d - 1 ? "Ăn sáng, tự do mua sắm, trả phòng và về lại điểm đón." : "Tham quan các điểm nổi bật theo chương trình, ăn trưa và tối đặc sản địa phương.",
          })),
        })
        .returning();
      await tx.insert(schema.tourDepartures).values(
        [5, 12, 19, 26, 40].map((d, i) => ({ tenantId: t.id, tourId: row.id, departDate: days(d + order), seatsTotal: 20 + (i % 2) * 10, price: i === 4 ? Math.round(tour.price * 0.9) : null })),
      );
      if (order <= 2) {
        const [c] = await tx
          .insert(schema.customers)
          .values({ tenantId: t.id, fullName: order === 1 ? "Hoàng Minh Anh" : "Đỗ Thu Trang", phone: `09123456${70 + order}`, email: order === 1 ? "minhanh@example.com" : null, source: "website", bookingCount: 1, consentAt: new Date() })
          .returning();
        await tx.insert(schema.bookingRequests).values({
          tenantId: t.id, code: `DC${days(0).replace(/-/g, "").slice(2)}-DEM${order}`, resourceType: "tour", resourceId: row.id, resourceLabel: row.title,
          bookingDate: days(5 + order), adults: 2, children: order === 1 ? 1 : 0, fullName: c.fullName, phone: c.phone, email: c.email,
          note: order === 1 ? "Gia đình có bé 6 tuổi, cần phòng tầng thấp" : "Gọi sau 18h giúp em", customerId: c.id,
          estimatedTotal: tour.price * 2 + (order === 1 ? tour.child : 0),
        });
      }
    }
  });
  console.log(`✓ Seed xong. Đăng nhập: admin@dulichdemo.vn / ${password}`);
}

/* ═════════════ Seed doanh nghiệp demo cho từng plugin ngành (src/plugins/<key>/seed.ts) ═════════════ */
const vn = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`);
const vnToday = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

async function seedIndustry(industry: string, d: DemoSeed) {
  const [exists] = await db.select({ id: schema.tenants.id }).from(schema.tenants).where(eq(schema.tenants.slug, d.slug));
  if (exists) {
    console.log(`✓ "${d.slug}" đã tồn tại`);
    return;
  }
  const preset = getPreset(industry);
  const password = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
  const pw = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  await db.transaction(async (tx) => {
    const [t] = await tx
      .insert(schema.tenants)
      .values({
        slug: d.slug,
        name: d.name,
        industry,
        plan: "pro",
        settings: {
          brand: { primaryColor: preset.color, tagline: preset.tagline },
          contact: d.contact,
          company: { ...d.company, address: d.contact.address },
          invoice: { prefix: d.slug.slice(0, 2).toUpperCase(), defaultVatRate: industry === "accounting" ? 10 : 8 },
          bankAccounts: [{ id: "vcb-main", bankBin: "970436", bankName: "Vietcombank", accountNumber: "0123456789", accountName: d.company.legalName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/Đ/g, "D"), isDefault: true }],
          misa: { enabled: true, env: "mock", invSeries: "1C26TDV", withCode: true },
        },
      })
      .returning();
    await tx.insert(schema.tenantModules).values(preset.modules.map((m) => ({ tenantId: t.id, moduleKey: m })));
    const [branch] = await tx.insert(schema.branches).values({ tenantId: t.id, name: "Cơ sở chính", address: d.contact.address, phone: d.contact.phone }).returning();
    const roles = await tx
      .insert(schema.roles)
      .values(DEFAULT_ROLES.map((r) => ({ tenantId: t.id, key: r.key, name: r.name, description: r.description, permissions: r.permissions, isSystem: true })))
      .returning();
    const roleId = (k: string) => roles.find((r) => r.key === k)!.id;
    const people = [
      { local: "admin", fullName: "Chủ doanh nghiệp", role: "owner", position: "Giám đốc" },
      { local: "letan", fullName: "Lễ tân", role: "receptionist", position: "Lễ tân" },
      { local: "ketoan", fullName: "Kế toán", role: "accountant", position: "Kế toán" },
    ];
    for (const [i, a] of people.entries()) {
      const [u] = await tx.insert(schema.users).values({ tenantId: t.id, fullName: a.fullName, email: `${a.local}@${d.domainEmail}`, passwordHash: pw }).returning();
      await tx.insert(schema.userRoles).values({ userId: u.id, roleId: roleId(a.role) });
      await tx.insert(schema.employees).values({ tenantId: t.id, branchId: branch.id, userId: u.id, code: `NV00${i + 1}`, fullName: a.fullName, email: `${a.local}@${d.domainEmail}`, position: a.position });
    }
    const itemIds = new Map<string, string>();
    let order = 0;
    for (const cat of d.categories) {
      const [c] = await tx.insert(schema.catalogCategories).values({ tenantId: t.id, name: cat.name, sortOrder: order++ }).returning();
      for (const [k, it] of cat.items.entries()) {
        const [row] = await tx.insert(schema.catalogItems).values({ tenantId: t.id, categoryId: c.id, sortOrder: k, ...it, tags: it.tags ?? [] }).returning();
        itemIds.set(it.name, row.id);
      }
    }
    const res = [];
    for (const [k, r] of d.resources.entries()) {
      const [row] = await tx
        .insert(schema.resources)
        .values({ tenantId: t.id, kind: r.kind, name: r.name, area: r.area ?? null, capacity: r.capacity ?? (r.kind === "room" ? 2 : 1), x: r.x ?? 0, y: r.y ?? 0, shape: r.shape ?? "square", itemId: r.itemName ? itemIds.get(r.itemName) ?? null : null, sortOrder: k })
        .returning();
      res.push(row);
    }
    // 2 đặt chỗ mẫu ngày mai để màn hình lễ tân / lịch có dữ liệu
    const tomorrow = new Date(Date.now() + 31 * 3600_000).toISOString().slice(0, 10);
    const samples = [
      { fullName: "Nguyễn Thu Hà", phone: "0912000101", time: preset.engine === "rooms" ? "14:00" : "10:00" },
      { fullName: "Trần Quốc Việt", phone: "0912000102", time: preset.engine === "rooms" ? "14:00" : "18:00" },
    ];
    for (const [k, sm] of samples.entries()) {
      const [cust] = await tx.insert(schema.customers).values({ tenantId: t.id, fullName: sm.fullName, phone: sm.phone, source: "website", bookingCount: 1, consentAt: new Date() }).returning();
      let resource = res.find((r) => r.kind === (preset.engine === "tables" ? "table" : preset.engine === "rooms" ? "room" : "staff"));
      if (preset.engine === "tables") resource = res.filter((r) => r.kind === "table")[k] ?? resource;
      if (preset.engine === "rooms") resource = res.filter((r) => r.kind === "room")[k * 3] ?? resource;
      if (preset.engine === "slots") resource = res.filter((r) => r.kind === "staff")[k] ?? resource;
      if (!resource) continue;
      const firstItem = d.categories[0]?.items[0];
      const startAt = vn(tomorrow, sm.time);
      const minutes = preset.engine === "rooms" ? 22 * 60 : preset.engine === "tables" ? preset.booking.durationMin : firstItem?.durationMin ?? 60;
      const endAt = new Date(startAt.getTime() + minutes * 60_000);
      const [bk] = await tx
        .insert(schema.bookingRequests)
        .values({
          tenantId: t.id, code: `DC${tomorrow.replace(/-/g, "").slice(2)}-${d.slug.slice(0, 2).toUpperCase()}${k + 1}`,
          resourceType: preset.engine === "tables" ? "table" : preset.engine === "rooms" ? "room" : "service",
          resourceId: preset.engine === "tables" ? resource.id : null, itemId: preset.engine === "tables" ? null : firstItem ? itemIds.get(firstItem.name) ?? null : null,
          resourceLabel: preset.engine === "tables" ? `Bàn ${resource.name}` : `${firstItem?.name ?? ""} · ${resource.name}`,
          bookingDate: tomorrow, bookingTime: sm.time, startAt, endAt, adults: 2, fullName: sm.fullName, phone: sm.phone,
          status: k === 0 ? "new" : "confirmed", estimatedTotal: firstItem?.price ?? 0, customerId: cust.id, source: "website",
        })
        .returning();
      await tx.insert(schema.reservations).values({ tenantId: t.id, resourceId: resource.id, bookingId: bk.id, startAt, endAt, partySize: 2, status: k === 0 ? "pending" : "confirmed" });
      if (preset.engine === "slots" && getPreset(industry).booking.needsBed) {
        const bed = res.filter((r) => r.kind === "bed")[k];
        if (bed) await tx.insert(schema.reservations).values({ tenantId: t.id, resourceId: bed.id, bookingId: bk.id, startAt, endAt, partySize: 1, status: k === 0 ? "pending" : "confirmed" });
      }
    }
    // Kế toán: khách doanh nghiệp + hợp đồng + lịch thuế 3 tháng tới
    if (d.extra === "accounting") {
      const pkg = itemIds.get(d.categories[0].items[0].name) ?? null;
      const companies = [
        { fullName: "Công ty TNHH Thương mại Hải Đăng", taxCode: "0316789012", phone: "0283800111", period: "quarterly", fee: 1_000_000 },
        { fullName: "Công ty CP Công nghệ Sao Mai", taxCode: "0317890123", phone: "0283800222", period: "monthly", fee: 2_500_000 },
        { fullName: "Hộ kinh doanh Cà phê Gió", taxCode: "8023456789", phone: "0909111222", period: "quarterly", fee: 600_000 },
      ];
      const today = vnToday();
      const until = new Date(Date.now() + 100 * 86400_000).toISOString().slice(0, 10);
      for (const [k, co] of companies.entries()) {
        const [cust] = await tx.insert(schema.customers).values({ tenantId: t.id, fullName: co.fullName, taxCode: co.taxCode, phone: co.phone, tags: ["Doanh nghiệp"], source: "referral" }).returning();
        const [c] = await tx
          .insert(schema.contracts)
          .values({ tenantId: t.id, customerId: cust.id, itemId: pkg, code: `HD-KT00${k + 1}`, title: "Dịch vụ kê khai thuế trọn gói", monthlyFee: co.fee, taxPeriod: co.period, startDate: "2026-01-01" })
          .returning();
        const tasks = tasksBetween(co.period as "monthly" | "quarterly", new Date(Date.now() - 40 * 86400_000).toISOString().slice(0, 10), until);
        if (tasks.length) await tx.insert(schema.taxTasks).values(tasks.map((x) => ({ ...x, tenantId: t.id, contractId: c.id, customerId: cust.id, status: x.dueDate < today ? "done" : "pending" })));
      }
    }
  });
  console.log(`✓ Seed "${d.slug}" (${industry}). Đăng nhập: admin@${d.domainEmail} / ${password}`);
}

/* ═════════════ Super Admin nền tảng ═════════════ */
async function seedPlatformAdmin() {
  const [any] = await db.select({ id: schema.platformAdmins.id }).from(schema.platformAdmins).limit(1);
  if (any) return;
  const username = (process.env.PLATFORM_ADMIN_USER || "dklab").toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD || "Dklab@123";
  await db.insert(schema.platformAdmins).values({ username, fullName: "Quản trị nền tảng", passwordHash: await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }) });
  console.log(`✓ Tạo Super Admin: ${username} (đăng nhập tại /superdklab)`);
}

(async () => {
  // Tạo database nếu chưa có + kiểm tra phiên bản / extension trước khi tạo bảng
  await ensureDatabase(url);
  console.log(`✓ PostgreSQL ${await preflight(client)}`);
  console.log("→ Chạy migration…");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ Migration xong");
  await seedPlatformAdmin();
  const own = tenantFromEnv();
  if (own) await ensureTenant(db, own);
  if (process.env.SEED !== "0") {
    // Dữ liệu demo chỉ cho các ngành được đóng gói (PLUGINS=...)
    const only = sitePlugins(); // PLUGINS=spa => chỉ seed demo ngành spa (kể cả khi image chứa mọi ngành)
    const want = (k: string) => INDUSTRY_PRESETS.some((p) => p.key === k) && (!only.length || only.includes(k));
    if (want("travel")) await seedTenant();
    for (const x of DEMO_SEEDS) if (want(x.industry)) await seedIndustry(x.industry, x.demo);
  }
  await client.end();
})().catch(async (e) => {
  console.error(e);
  await client.end();
  process.exit(1);
});
