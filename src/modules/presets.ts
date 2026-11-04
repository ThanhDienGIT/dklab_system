/**
 * Preset ngành = danh sách module bật sẵn + vai trò mặc định.
 * Tạo tenant mới chỉ cần chọn preset, không phải viết code.
 */

export type RolePreset = { key: string; name: string; description: string; permissions: string[] };

import { PLUGINS } from "@/plugins/_registry";
import type { IndustryConfig } from "@/plugins/types";

export type IndustryPreset = IndustryConfig & { key: string; name: string; description: string };

/** Danh sách ngành = các plugin có khai báo `industry` (src/plugins/<key>/manifest.ts) */
export const INDUSTRY_PRESETS: IndustryPreset[] = PLUGINS.filter((p) => p.industry).map((p) => ({
  key: p.key,
  name: p.name,
  description: p.description,
  ...p.industry!,
}));

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
      "catalog.view", "catalog.manage", "resource.view", "resource.manage", "schedule.view",
      "contract.view", "contract.manage", "tax.manage",
    ],
  },
  {
    key: "receptionist",
    name: "Lễ tân / Tiếp nhận",
    description: "Tiếp nhận đặt chỗ, gọi khách xác nhận, lập hóa đơn",
    permissions: [
      "dashboard.view", "booking.view", "booking.handle", "customer.view", "customer.manage",
      "invoice.view", "invoice.create", "invoice.payment", "tour.view",
      "catalog.view", "resource.view", "schedule.view", "contract.view",
    ],
  },
  {
    key: "accountant",
    name: "Kế toán",
    description: "Hóa đơn, thanh toán, hóa đơn điện tử",
    permissions: ["dashboard.view", "invoice.view", "invoice.create", "invoice.payment", "invoice.cancel", "einvoice.publish", "customer.view", "contract.view", "contract.manage", "tax.manage"],
  },
  {
    key: "staff",
    name: "Nhân viên",
    description: "Chỉ xem các đặt chỗ được giao cho mình",
    permissions: ["booking.view:own", "booking.handle:own", "tour.view", "schedule.view", "resource.view"],
  },
];

export function getPreset(key: string): IndustryPreset {
  return INDUSTRY_PRESETS.find((p) => p.key === key) ?? INDUSTRY_PRESETS.find((p) => p.key === "travel")!;
}
