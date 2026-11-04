/**
 * Hợp đồng (contract) của một plugin ngành nghề.
 * Thêm ngành mới: `npm run plugin:new <key> "<Tên ngành>" <engine>` => tạo thư mục src/plugins/<key>/
 * Registry được sinh tự động (scripts/gen-plugins.ts), không cần sửa code core.
 *
 * File này phải dùng được ở cả client lẫn server (không import gì từ server).
 */

/** Động cơ đặt chỗ mà ngành sử dụng */
export type Engine =
  | "tours" // tour + lịch khởi hành + số chỗ (du lịch)
  | "slots" // dịch vụ có thời lượng + khung giờ + người/giường phục vụ (spa, salon, nha khoa, tư vấn)
  | "tables" // bàn + sơ đồ bàn + giờ đến (cà phê, nhà hàng, karaoke)
  | "rooms"; // loại phòng + phòng + ngày nhận/trả (khách sạn, homestay)

export type ResourceKind = "table" | "room" | "bed" | "staff";

export type IndustryLabels = {
  /** "Đặt bàn", "Đặt lịch", "Đặt phòng"… */
  booking: string;
  /** Tên tài nguyên: "Bàn", "Phòng", "Giường" */
  resource: string;
  /** Tên mục trong danh mục: "Món", "Dịch vụ", "Loại phòng", "Gói dịch vụ" */
  item: string;
  /** Người phục vụ (engine slots): "Kỹ thuật viên", "Chuyên viên" */
  staff?: string;
  /** Nhãn menu admin */
  catalogNav: string;
  resourceNav: string;
};

export type BookingConfig = {
  open: string; // "08:00"
  close: string; // "22:00"
  /** Bước khung giờ (phút) */
  step: number;
  /** Thời lượng giữ bàn mặc định (engine tables) */
  durationMin: number;
  /** engine slots: có bắt buộc chọn giường/phòng (ngoài nhân viên) không */
  needsBed?: boolean;
  /** engine tables: cho chọn món trước khi đặt bàn */
  preorder?: boolean;
};

export type IndustryConfig = {
  engine: Engine;
  /** Module bật sẵn khi tạo doanh nghiệp ngành này */
  modules: string[];
  labels: IndustryLabels;
  booking: BookingConfig;
  /** Màu thương hiệu mặc định */
  color: string;
  /** Câu khẩu hiệu mặc định cho trang chủ */
  tagline: string;
  /** Mô tả hero trang chủ */
  heroText: string;
  /** Biểu tượng (tên icon lucide) cho trang chủ */
  icon: string;
};

export type NavItem = { href: string; label: string; icon: string; permission: string; labelKey?: "catalogNav" | "resourceNav" };
export type PermissionDef = { key: string; label: string };
export type ModuleManifest = {
  key: string;
  name: string;
  description: string;
  core?: boolean;
  permissions: PermissionDef[];
  nav: NavItem[];
};

export type PluginManifest = {
  key: string;
  name: string;
  description: string;
  /** Có => đây là một ngành nghề chọn được khi tạo doanh nghiệp */
  industry?: IndustryConfig;
  /** Module chức năng riêng mà plugin đóng góp (vd: hợp đồng & lịch thuế của kế toán) */
  modules?: ModuleManifest[];
};

/* ───────────── Dữ liệu demo (chỉ dùng trong script seed, không vào bundle client) ───────────── */
export type DemoSeed = {
  slug: string;
  name: string;
  domainEmail: string; // vd: spademo.vn => admin@spademo.vn
  contact: { phone: string; hotline?: string; email: string; address: string };
  company: { legalName: string; taxCode: string };
  categories: { name: string; items: { name: string; description?: string; price: number; durationMin?: number; capacity?: number; tags?: string[] }[] }[];
  resources: { kind: ResourceKind; name: string; area?: string; capacity?: number; x?: number; y?: number; shape?: "round" | "square" | "rect"; itemName?: string }[];
  /** Hook seed thêm dữ liệu riêng (vd: hợp đồng kế toán) */
  extra?: string;
};
