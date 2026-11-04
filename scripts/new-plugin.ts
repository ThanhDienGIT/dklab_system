/**
 * Tạo plugin ngành mới:
 *   npm run plugin:new -- <key> "<Tên ngành>" <engine: slots|tables|rooms>
 * Ví dụ:
 *   npm run plugin:new -- salon "Salon tóc" slots
 *   npm run plugin:new -- karaoke "Karaoke" tables
 *   npm run plugin:new -- homestay "Homestay" rooms
 * Sau đó sửa nhãn/màu trong src/plugins/<key>/manifest.ts và dữ liệu mẫu trong seed.ts.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const [key, name, engine = "slots"] = process.argv.slice(2);
if (!key || !/^[a-z][a-z0-9_]{1,30}$/.test(key) || !name) {
  console.error('Cách dùng: npm run plugin:new -- <key a-z0-9_> "<Tên ngành>" <slots|tables|rooms>');
  process.exit(1);
}
if (!["slots", "tables", "rooms"].includes(engine)) {
  console.error("engine phải là slots | tables | rooms");
  process.exit(1);
}
const dir = join(process.cwd(), "src/plugins", key);
if (existsSync(dir)) {
  console.error(`Đã tồn tại plugin ${key}`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });

const L = {
  slots: { booking: "Đặt lịch", resource: "Phòng / ghế", item: "Dịch vụ", staff: "Nhân viên", catalogNav: "Dịch vụ", resourceNav: "Nhân viên & phòng", icon: "calendar", step: 30, dur: 60 },
  tables: { booking: "Đặt bàn", resource: "Bàn", item: "Món", staff: undefined, catalogNav: "Menu", resourceNav: "Sơ đồ bàn", icon: "utensils", step: 30, dur: 90 },
  rooms: { booking: "Đặt phòng", resource: "Phòng", item: "Loại phòng", staff: undefined, catalogNav: "Loại phòng", resourceNav: "Sơ đồ phòng", icon: "bed", step: 60, dur: 0 },
}[engine as "slots" | "tables" | "rooms"];

writeFileSync(
  join(dir, "manifest.ts"),
  `import type { PluginManifest } from "../types";

export const plugin: PluginManifest = {
  key: "${key}",
  name: ${JSON.stringify(name)},
  description: ${JSON.stringify(`${name}: ${L.booking.toLowerCase()} trực tuyến`)},
  industry: {
    engine: "${engine}",
    modules: ["core", "booking", "crm", "hr", "invoice", "catalog", "resource", "schedule"],
    labels: { booking: "${L.booking}", resource: "${L.resource}", item: "${L.item}",${L.staff ? ` staff: "${L.staff}",` : ""} catalogNav: "${L.catalogNav}", resourceNav: "${L.resourceNav}" },
    booking: { open: "08:00", close: "21:00", step: ${L.step}, durationMin: ${L.dur}${engine === "slots" ? ", needsBed: false" : ""} },
    color: "#4f46e5",
    tagline: ${JSON.stringify(`${name} – Đặt chỗ nhanh, xác nhận tận tình`)},
    heroText: "Chọn thời gian phù hợp và để lại số điện thoại, chúng tôi sẽ gọi xác nhận ngay.",
    icon: "${L.icon}",
  },
};
`,
);
writeFileSync(
  join(dir, "seed.ts"),
  `import type { DemoSeed } from "../types";

export const demo: DemoSeed = {
  slug: "${key}_demo",
  name: ${JSON.stringify(`${name} Demo`)},
  domainEmail: "${key.replace(/_/g, "")}demo.vn",
  contact: { phone: "0900000000", email: "lienhe@${key.replace(/_/g, "")}demo.vn", address: "TP.HCM" },
  company: { legalName: ${JSON.stringify(`Công ty ${name} Demo`)}, taxCode: "0300000000" },
  categories: [{ name: "${L.catalogNav}", items: [{ name: "${L.item} mẫu", price: 100000${engine === "slots" ? ", durationMin: 60" : engine === "rooms" ? ", capacity: 2" : ""} }] }],
  resources: [${
    engine === "tables"
      ? `{ kind: "table", name: "B1", area: "Tầng 1", capacity: 4, x: 1, y: 1, shape: "square" }`
      : engine === "rooms"
        ? `{ kind: "room", name: "101", area: "Tầng 1", itemName: "${L.item} mẫu" }`
        : `{ kind: "staff", name: "Nhân viên A" }`
  }],
};
`,
);
execSync("npx tsx scripts/gen-plugins.ts", { stdio: "inherit" });
console.log(`✓ Đã tạo src/plugins/${key}. Chạy "npm run db:migrate" để tạo doanh nghiệp demo ${key}_demo.`);
