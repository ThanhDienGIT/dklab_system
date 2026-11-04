import type { DemoSeed } from "../types";

export const demo: DemoSeed = {
  slug: "spa_demo",
  name: "Lotus Spa Demo",
  domainEmail: "spademo.vn",
  contact: { phone: "0902345678", hotline: "1900 1111", email: "booking@spademo.vn", address: "45 Lê Lợi, Quận 1, TP.HCM" },
  company: { legalName: "Công ty TNHH Lotus Spa Demo", taxCode: "0313456789" },
  categories: [
    { name: "Massage trị liệu", items: [
      { name: "Massage body đá nóng", description: "Đá bazan nóng giúp giãn cơ, lưu thông khí huyết.", price: 450_000, durationMin: 90 },
      { name: "Massage cổ vai gáy", description: "Giảm đau mỏi cho dân văn phòng.", price: 250_000, durationMin: 45 },
      { name: "Bấm huyệt chân", description: "Thư giãn, ngủ ngon hơn.", price: 200_000, durationMin: 60 },
    ] },
    { name: "Chăm sóc da", items: [
      { name: "Chăm sóc da mặt cơ bản", description: "Làm sạch sâu, đắp mặt nạ, cấp ẩm.", price: 350_000, durationMin: 60 },
      { name: "Trị mụn chuẩn y khoa", description: "Lấy nhân mụn, điện di, kháng viêm.", price: 550_000, durationMin: 75 },
    ] },
    { name: "Gói thư giãn", items: [
      { name: "Gói Lotus 2 giờ", description: "Xông hơi + massage body + chăm sóc da mặt.", price: 990_000, durationMin: 120, tags: ["Bán chạy"] },
    ] },
  ],
  resources: [
    { kind: "bed", name: "Phòng 1", area: "Tầng 2" },
    { kind: "bed", name: "Phòng 2", area: "Tầng 2" },
    { kind: "bed", name: "Phòng VIP", area: "Tầng 3", capacity: 2 },
    { kind: "staff", name: "KTV Ngọc Anh" },
    { kind: "staff", name: "KTV Thảo" },
    { kind: "staff", name: "KTV Minh" },
  ],
};
