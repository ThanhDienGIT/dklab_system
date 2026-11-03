/**
 * Chạy migration + seed dữ liệu demo (idempotent).
 * Tự chạy trong `npm run build` (Vercel) nếu có DATABASE_URL.
 *   npm run db:migrate          # migrate + seed
 *   SEED=0 npm run db:migrate   # chỉ migrate
 */
import { hash } from "@node-rs/argon2";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { DEFAULT_ROLES, getPreset } from "../src/modules/presets";

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn("⚠️  Bỏ qua migrate: chưa có DATABASE_URL");
  process.exit(0);
}

const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
const db = drizzle(client, { schema });

const days = (n: number) => new Date(Date.now() + n * 86400_000).toISOString().slice(0, 10);

async function seedTenant() {
  const slug = process.env.DEFAULT_TENANT || "dulich_demo";
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
        settings: {
          brand: { primaryColor: "#0e7490", tagline: "Hành trình trọn vẹn – Giá minh bạch – Hỗ trợ 24/7" },
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

(async () => {
  console.log("→ Chạy migration…");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ Migration xong");
  if (process.env.SEED !== "0") await seedTenant();
  await client.end();
})().catch(async (e) => {
  console.error(e);
  await client.end();
  process.exit(1);
});
