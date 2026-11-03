/**
 * Preset ngành = danh sách module bật sẵn + vai trò mặc định.
 * Tạo tenant mới chỉ cần chọn preset, không phải viết code.
 */

export type RolePreset = { key: string; name: string; description: string; permissions: string[] };

export type IndustryPreset = {
  key: string;
  name: string;
  modules: string[];
  /** Nhãn dùng chung cho màn hình đặt chỗ */
  bookingLabel: string;
  resourceLabel: string;
  status: "ready" | "planned";
};

const COMMON_MODULES = ["core", "booking", "crm", "hr", "invoice"];

export const INDUSTRY_PRESETS: IndustryPreset[] = [
  { key: "travel", name: "Du lịch – Lữ hành", modules: [...COMMON_MODULES, "tour"], bookingLabel: "Đặt tour", resourceLabel: "Tour", status: "ready" },
  { key: "cafe", name: "Quán cà phê", modules: [...COMMON_MODULES, "table", "menu"], bookingLabel: "Đặt bàn", resourceLabel: "Bàn", status: "planned" },
  { key: "restaurant", name: "Nhà hàng", modules: [...COMMON_MODULES, "table", "menu"], bookingLabel: "Đặt bàn", resourceLabel: "Bàn", status: "planned" },
  { key: "hotel", name: "Khách sạn", modules: [...COMMON_MODULES, "room"], bookingLabel: "Đặt phòng", resourceLabel: "Phòng", status: "planned" },
  { key: "spa", name: "Spa – Làm đẹp", modules: [...COMMON_MODULES, "spa-service"], bookingLabel: "Đặt lịch", resourceLabel: "Dịch vụ", status: "planned" },
  { key: "accounting", name: "Dịch vụ kế toán", modules: [...COMMON_MODULES], bookingLabel: "Đặt lịch tư vấn", resourceLabel: "Dịch vụ", status: "planned" },
];

/** Vai trò mặc định (dùng chung mọi ngành, chủ doanh nghiệp có thể sửa / tạo thêm). */
export const DEFAULT_ROLES: RolePreset[] = [
  {
    key: "owner",
    name: "Chủ doanh nghiệp",
    description: "Toàn quyền trong doanh nghiệp",
    permissions: ["*"],
  },
  {
    key: "manager",
    name: "Quản lý",
    description: "Điều hành vận hành, không quản lý tài khoản",
    permissions: [
      "dashboard.view", "booking.view", "booking.handle", "booking.delete",
      "customer.view", "customer.manage", "employee.view", "employee.manage",
      "invoice.view", "invoice.create", "invoice.payment", "invoice.cancel", "einvoice.publish",
      "tour.view", "tour.manage", "audit.view",
    ],
  },
  {
    key: "receptionist",
    name: "Lễ tân / Tiếp nhận",
    description: "Tiếp nhận đặt chỗ, gọi khách xác nhận, lập hóa đơn",
    permissions: [
      "dashboard.view", "booking.view", "booking.handle", "customer.view", "customer.manage",
      "invoice.view", "invoice.create", "invoice.payment", "tour.view",
    ],
  },
  {
    key: "accountant",
    name: "Kế toán",
    description: "Hóa đơn, thanh toán, hóa đơn điện tử",
    permissions: ["dashboard.view", "invoice.view", "invoice.create", "invoice.payment", "invoice.cancel", "einvoice.publish", "customer.view"],
  },
  {
    key: "staff",
    name: "Nhân viên",
    description: "Chỉ xem các đặt chỗ được giao cho mình",
    permissions: ["booking.view:own", "booking.handle:own", "tour.view"],
  },
];

export function getPreset(key: string) {
  return INDUSTRY_PRESETS.find((p) => p.key === key) ?? INDUSTRY_PRESETS[0];
}
