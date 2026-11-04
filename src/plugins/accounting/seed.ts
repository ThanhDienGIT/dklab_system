import type { DemoSeed } from "../types";

export const demo: DemoSeed = {
  slug: "ketoan_demo",
  name: "Kế Toán Tín Việt Demo",
  domainEmail: "ketoandemo.vn",
  contact: { phone: "0906789012", email: "tuvan@ketoandemo.vn", address: "150 Cộng Hòa, Tân Bình, TP.HCM" },
  company: { legalName: "Công ty TNHH Dịch vụ Kế toán Tín Việt Demo", taxCode: "0315678901" },
  categories: [
    { name: "Gói hàng tháng", items: [
      { name: "Kê khai thuế trọn gói (DN nhỏ)", description: "Kê khai GTGT, TNCN, nộp tờ khai đúng hạn, tư vấn qua Zalo.", price: 1_000_000, durationMin: 30, tags: ["Phổ biến"] },
      { name: "Kế toán dịch vụ trọn gói", description: "Sổ sách, kê khai, báo cáo tài chính cuối năm.", price: 2_500_000, durationMin: 30 },
    ] },
    { name: "Dịch vụ một lần", items: [
      { name: "Thành lập doanh nghiệp", description: "Hồ sơ, đăng ký, khắc dấu, chữ ký số.", price: 1_500_000, durationMin: 30 },
      { name: "Quyết toán thuế TNDN cuối năm", price: 3_000_000, durationMin: 60 },
      { name: "Tư vấn miễn phí 30 phút", price: 0, durationMin: 30 },
    ] },
  ],
  resources: [
    { kind: "staff", name: "CV. Lê Thu Hà" },
    { kind: "staff", name: "CV. Phạm Quốc Bảo" },
  ],
  extra: "accounting",
};
