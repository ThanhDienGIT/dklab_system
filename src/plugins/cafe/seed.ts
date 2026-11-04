import type { DemoSeed } from "../types";

export const demo: DemoSeed = {
  slug: "cafe_demo",
  name: "Mộc Cà Phê Demo",
  domainEmail: "cafedemo.vn",
  contact: { phone: "0903456789", email: "hello@cafedemo.vn", address: "12 Nguyễn Thị Minh Khai, Quận 3, TP.HCM" },
  company: { legalName: "Hộ kinh doanh Mộc Cà Phê", taxCode: "8012345678" },
  categories: [
    { name: "Cà phê", items: [
      { name: "Cà phê sữa đá", price: 35_000, tags: ["Bán chạy"] },
      { name: "Bạc xỉu", price: 39_000 },
      { name: "Cà phê muối", price: 45_000, tags: ["Mới"] },
      { name: "Cold brew cam sả", price: 55_000 },
    ] },
    { name: "Trà & Đá xay", items: [
      { name: "Trà đào cam sả", price: 45_000 },
      { name: "Trà sen vàng", price: 49_000 },
      { name: "Matcha đá xay", price: 59_000 },
    ] },
    { name: "Bánh", items: [
      { name: "Croissant bơ", price: 35_000 },
      { name: "Tiramisu", price: 49_000 },
    ] },
  ],
  resources: [
    // Tầng 1: lưới 12 x 8
    { kind: "table", name: "B1", area: "Tầng 1", capacity: 2, x: 1, y: 1, shape: "round" },
    { kind: "table", name: "B2", area: "Tầng 1", capacity: 2, x: 4, y: 1, shape: "round" },
    { kind: "table", name: "B3", area: "Tầng 1", capacity: 4, x: 7, y: 1, shape: "square" },
    { kind: "table", name: "B4", area: "Tầng 1", capacity: 4, x: 1, y: 4, shape: "square" },
    { kind: "table", name: "B5", area: "Tầng 1", capacity: 6, x: 5, y: 4, shape: "rect" },
    { kind: "table", name: "B6", area: "Tầng 1", capacity: 2, x: 10, y: 5, shape: "round" },
    { kind: "table", name: "V1", area: "Sân vườn", capacity: 4, x: 1, y: 1, shape: "square" },
    { kind: "table", name: "V2", area: "Sân vườn", capacity: 4, x: 5, y: 1, shape: "square" },
    { kind: "table", name: "V3", area: "Sân vườn", capacity: 8, x: 3, y: 4, shape: "rect" },
  ],
};
