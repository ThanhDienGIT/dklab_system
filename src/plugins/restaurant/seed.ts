import type { DemoSeed } from "../types";

export const demo: DemoSeed = {
  slug: "nhahang_demo",
  name: "Nhà Hàng Quê Nhà Demo",
  domainEmail: "nhahangdemo.vn",
  contact: { phone: "0904567890", hotline: "1900 2222", email: "datban@nhahangdemo.vn", address: "88 Hai Bà Trưng, Quận 1, TP.HCM" },
  company: { legalName: "Công ty TNHH Quê Nhà Demo", taxCode: "0314567890" },
  categories: [
    { name: "Khai vị", items: [
      { name: "Gỏi cuốn tôm thịt", price: 65_000 },
      { name: "Chả giò hải sản", price: 89_000 },
    ] },
    { name: "Món chính", items: [
      { name: "Cá kho tộ", price: 149_000, tags: ["Đặc sản"] },
      { name: "Gà nướng mật ong", price: 199_000 },
      { name: "Bò lúc lắc", price: 219_000, tags: ["Bán chạy"] },
      { name: "Lẩu thái hải sản", price: 399_000, description: "2–4 người" },
    ] },
    { name: "Tráng miệng & Đồ uống", items: [
      { name: "Chè khúc bạch", price: 45_000 },
      { name: "Nước ép cam", price: 49_000 },
    ] },
  ],
  resources: [
    { kind: "table", name: "T1", area: "Sảnh chính", capacity: 4, x: 1, y: 1, shape: "square" },
    { kind: "table", name: "T2", area: "Sảnh chính", capacity: 4, x: 4, y: 1, shape: "square" },
    { kind: "table", name: "T3", area: "Sảnh chính", capacity: 4, x: 7, y: 1, shape: "square" },
    { kind: "table", name: "T4", area: "Sảnh chính", capacity: 6, x: 1, y: 4, shape: "rect" },
    { kind: "table", name: "T5", area: "Sảnh chính", capacity: 6, x: 6, y: 4, shape: "rect" },
    { kind: "table", name: "T6", area: "Sảnh chính", capacity: 2, x: 10, y: 1, shape: "round" },
    { kind: "table", name: "VIP1", area: "Phòng VIP", capacity: 10, x: 2, y: 2, shape: "rect" },
    { kind: "table", name: "VIP2", area: "Phòng VIP", capacity: 12, x: 7, y: 2, shape: "round" },
  ],
};
