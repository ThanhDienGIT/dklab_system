import type { DemoSeed } from "../types";

export const demo: DemoSeed = {
  slug: "khachsan_demo",
  name: "Sea Breeze Hotel Demo",
  domainEmail: "khachsandemo.vn",
  contact: { phone: "0905678901", hotline: "1900 3333", email: "reservation@khachsandemo.vn", address: "20 Võ Nguyên Giáp, Sơn Trà, Đà Nẵng" },
  company: { legalName: "Công ty TNHH Sea Breeze Demo", taxCode: "0401234567" },
  categories: [
    { name: "Phòng", items: [
      { name: "Standard", description: "1 giường đôi, 22m², cửa sổ thành phố.", price: 650_000, capacity: 2 },
      { name: "Deluxe hướng biển", description: "1 giường King, 30m², ban công hướng biển.", price: 1_150_000, capacity: 2, tags: ["Được yêu thích"] },
      { name: "Family", description: "2 giường đôi, 40m², phù hợp gia đình 4 người.", price: 1_550_000, capacity: 4 },
    ] },
  ],
  resources: [
    { kind: "room", name: "101", area: "Tầng 1", itemName: "Standard" },
    { kind: "room", name: "102", area: "Tầng 1", itemName: "Standard" },
    { kind: "room", name: "103", area: "Tầng 1", itemName: "Standard" },
    { kind: "room", name: "201", area: "Tầng 2", itemName: "Deluxe hướng biển" },
    { kind: "room", name: "202", area: "Tầng 2", itemName: "Deluxe hướng biển" },
    { kind: "room", name: "203", area: "Tầng 2", itemName: "Deluxe hướng biển" },
    { kind: "room", name: "301", area: "Tầng 3", itemName: "Family" },
    { kind: "room", name: "302", area: "Tầng 3", itemName: "Family" },
  ],
};
