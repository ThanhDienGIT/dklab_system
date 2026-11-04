/**
 * Gói dịch vụ & Cửa hàng plugin (dùng được ở client lẫn server).
 *  - Mỗi ngành có sẵn các module nền tảng của ngành (preset).
 *  - Gói (plan) tặng kèm một số plugin.
 *  - Ngoài gói, doanh nghiệp mua thêm từng plugin theo tháng tại Cửa hàng.
 * Giá tính VND / tháng. Mua 12 tháng chỉ trả 10 tháng.
 */
export type PlanKey = "basic" | "pro" | "enterprise";

export type Plan = { key: PlanKey; name: string; price: number; tagline: string; includes: string[]; highlights: string[] };

export type Addon = {
  key: string; // = module key trong registry
  name: string;
  icon: string;
  price: number;
  category: "Bán hàng" | "Vận hành" | "Tài chính" | "Thương hiệu";
  summary: string;
  features: string[];
};

export const ADDONS: Addon[] = [
  { key: "einvoice", name: "Hóa đơn điện tử MISA", icon: "receipt", price: 99_000, category: "Tài chính", summary: "Đẩy hóa đơn sang MISA meInvoice và phát hành ngay trên hệ thống.", features: ["Đẩy hóa đơn 1 chạm", "Lưu ký hiệu, số HĐ, mã CQT", "Gửi HĐĐT cho khách qua email"] },
  { key: "custom_domain", name: "Tên miền riêng", icon: "globe", price: 49_000, category: "Thương hiệu", summary: "Website chạy trên tên miền của bạn (vd: spahoamai.vn) thay vì subdomain.", features: ["Xác minh DNS tự động", "SSL miễn phí", "Nhiều tên miền"] },
  { key: "schedule", name: "Lịch timeline", icon: "calendar", price: 79_000, category: "Vận hành", summary: "Lịch theo ngày cho từng bàn / phòng / nhân viên, thao tác nhanh khách đến – xong.", features: ["Xem theo ngày / 14 ngày", "Vạch giờ hiện tại", "Đổi trạng thái 1 chạm"] },
  { key: "resource", name: "Sơ đồ & tài nguyên", icon: "grid", price: 99_000, category: "Vận hành", summary: "Sơ đồ bàn kéo thả, sơ đồ phòng, quản lý giường / nhân viên phục vụ.", features: ["Trạng thái trực tiếp", "Xếp khách vãng lai", "Check-in / check-out"] },
  { key: "catalog", name: "Danh mục: menu / dịch vụ", icon: "list", price: 79_000, category: "Bán hàng", summary: "Quản lý menu, dịch vụ có thời lượng, loại phòng, gói dịch vụ; hiện ngay trên website.", features: ["Nhóm & sắp xếp", "Giá, thời lượng, sức chứa", "Ẩn / hiện tức thì"] },
  { key: "tour", name: "Tour du lịch", icon: "map", price: 149_000, category: "Bán hàng", summary: "Bán tour có lịch khởi hành, số chỗ, giá người lớn / trẻ em.", features: ["Lịch trình theo ngày", "Chống bán vượt số chỗ", "Trang tour chuẩn SEO"] },
  { key: "accounting", name: "Hợp đồng & lịch thuế", icon: "file", price: 199_000, category: "Tài chính", summary: "Hợp đồng dịch vụ, nhắc hạn kê khai thuế, lập hóa đơn phí tháng hàng loạt.", features: ["Lịch thuế tháng / quý / năm", "Cảnh báo quá hạn", "Hóa đơn phí 1 chạm"] },
];

export const PLANS: Plan[] = [
  { key: "basic", name: "Cơ bản", price: 199_000, tagline: "Đủ để bắt đầu nhận đặt chỗ online", includes: [], highlights: ["Website + đặt chỗ theo ngành", "Khách hàng, nhân viên, phân quyền", "Hóa đơn + VietQR"] },
  { key: "pro", name: "Chuyên nghiệp", price: 399_000, tagline: "Cho cơ sở đang phát triển", includes: ["einvoice", "custom_domain", "schedule"], highlights: ["Mọi thứ của gói Cơ bản", "Hóa đơn điện tử MISA", "Tên miền riêng", "Lịch timeline"] },
  { key: "enterprise", name: "Doanh nghiệp", price: 799_000, tagline: "Mở khóa toàn bộ plugin", includes: ADDONS.map((a) => a.key), highlights: ["Mọi plugin trong cửa hàng", "Ưu tiên hỗ trợ", "Phù hợp chuỗi nhiều chi nhánh"] },
];

export const getPlan = (k: string | null | undefined) => PLANS.find((p) => p.key === k) ?? PLANS[0];
export const getAddon = (k: string) => ADDONS.find((a) => a.key === k);

/** Số tiền phải trả: 12 tháng chỉ tính 10 */
export function priceFor(monthly: number, months: number) {
  return monthly * (months >= 12 ? months - Math.floor(months / 12) * 2 : months);
}
export const TERMS = [1, 3, 6, 12] as const;
export const TRIAL_DAYS = 14;
