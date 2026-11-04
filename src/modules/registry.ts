/**
 * Hệ thống plugin: mỗi module tự khai báo quyền + menu quản trị.
 * Core đọc registry để sinh menu, kiểm tra quyền và bật/tắt theo tenant.
 * Thêm ngành mới = viết module mới (nếu cần) + thêm preset trong presets.ts.
 *
 * File này dùng được cả ở server lẫn client (không import gì từ server).
 */

import { PLUGINS } from "@/plugins/_registry";
import type { ModuleManifest } from "@/plugins/types";
export type { ModuleManifest, NavItem, PermissionDef } from "@/plugins/types";

export type Scope = "own" | "branch" | "tenant";

const CORE_MODULES: ModuleManifest[] = [
  {
    key: "core",
    name: "Hệ thống",
    description: "Tổng quan, cài đặt doanh nghiệp, domain, phân quyền, nhật ký",
    core: true,
    permissions: [
      { key: "dashboard.view", label: "Xem tổng quan" },
      { key: "settings.manage", label: "Cấu hình doanh nghiệp, ngân hàng, domain, hóa đơn điện tử" },
      { key: "users.manage", label: "Quản lý tài khoản đăng nhập & vai trò" },
      { key: "audit.view", label: "Xem nhật ký hoạt động" },
      { key: "billing.manage", label: "Mua gói / plugin, xem đơn mua" },
    ],
    nav: [
      { href: "/admin", label: "Tổng quan", icon: "home", permission: "dashboard.view" },
      { href: "/admin/users", label: "Tài khoản & quyền", icon: "shield", permission: "users.manage" },
      { href: "/admin/settings", label: "Cài đặt", icon: "settings", permission: "settings.manage" },
      { href: "/admin/audit", label: "Nhật ký", icon: "history", permission: "audit.view" },
      { href: "/admin/store", label: "Cửa hàng plugin", icon: "store", permission: "billing.manage" },
    ],
  },
  {
    key: "booking",
    name: "Tiếp nhận đặt chỗ",
    description: "Danh sách yêu cầu đặt bàn / phòng / tour / lịch hẹn; lễ tân gọi xác nhận",
    core: true,
    permissions: [
      { key: "booking.view", label: "Xem danh sách đặt chỗ" },
      { key: "booking.handle", label: "Tiếp nhận, gọi khách, đổi trạng thái" },
      { key: "booking.delete", label: "Xóa yêu cầu đặt chỗ" },
    ],
    nav: [{ href: "/admin/bookings", label: "Đặt chỗ", icon: "inbox", permission: "booking.view" }],
  },
  {
    key: "crm",
    name: "Khách hàng",
    description: "Hồ sơ khách, lịch sử đặt chỗ & hóa đơn, tag, nguồn khách",
    core: true,
    permissions: [
      { key: "customer.view", label: "Xem khách hàng" },
      { key: "customer.manage", label: "Thêm / sửa khách hàng" },
    ],
    nav: [{ href: "/admin/customers", label: "Khách hàng", icon: "users", permission: "customer.view" }],
  },
  {
    key: "hr",
    name: "Nhân sự",
    description: "Hồ sơ nhân viên, chức vụ, phòng ban, chi nhánh",
    core: true,
    permissions: [
      { key: "employee.view", label: "Xem nhân viên" },
      { key: "employee.manage", label: "Thêm / sửa nhân viên" },
    ],
    nav: [{ href: "/admin/employees", label: "Nhân viên", icon: "id", permission: "employee.view" }],
  },
  {
    key: "invoice",
    name: "Hóa đơn & thanh toán",
    description: "Xuất hóa đơn, QR VietQR theo ngân hàng, ghi nhận thanh toán, HĐĐT MISA",
    core: true,
    permissions: [
      { key: "invoice.view", label: "Xem hóa đơn" },
      { key: "invoice.create", label: "Lập hóa đơn" },
      { key: "invoice.payment", label: "Ghi nhận thanh toán" },
      { key: "invoice.cancel", label: "Hủy hóa đơn" },
    ],
    nav: [{ href: "/admin/invoices", label: "Hóa đơn", icon: "receipt", permission: "invoice.view" }],
  },
  {
    key: "einvoice",
    name: "Hóa đơn điện tử MISA",
    description: "Đẩy hóa đơn sang MISA meInvoice, phát hành, lưu số hóa đơn",
    permissions: [{ key: "einvoice.publish", label: "Đẩy / phát hành hóa đơn điện tử MISA" }],
    nav: [],
  },
  {
    key: "custom_domain",
    name: "Tên miền riêng",
    description: "Gắn tên miền của doanh nghiệp (dulichabc.vn), xác minh DNS, SSL tự động",
    permissions: [],
    nav: [],
  },
  {
    key: "catalog",
    name: "Danh mục (menu / dịch vụ / loại phòng)",
    description: "Nhóm và mục: món, dịch vụ có thời lượng, loại phòng, gói dịch vụ; giá, ảnh",
    permissions: [
      { key: "catalog.view", label: "Xem danh mục" },
      { key: "catalog.manage", label: "Thêm / sửa danh mục, giá" },
    ],
    nav: [{ href: "/admin/catalog", label: "Danh mục", icon: "list", permission: "catalog.view", labelKey: "catalogNav" }],
  },
  {
    key: "resource",
    name: "Tài nguyên (bàn / phòng / giường / nhân viên)",
    description: "Sơ đồ bàn, phòng, giường, người phục vụ; trạng thái trống / đang dùng",
    permissions: [
      { key: "resource.view", label: "Xem sơ đồ & trạng thái" },
      { key: "resource.manage", label: "Thêm / sửa / sắp xếp sơ đồ" },
    ],
    nav: [{ href: "/admin/resources", label: "Tài nguyên", icon: "grid", permission: "resource.view", labelKey: "resourceNav" }],
  },
  {
    key: "schedule",
    name: "Lịch",
    description: "Lịch theo ngày: ai / bàn / phòng nào đang được đặt khung giờ nào",
    permissions: [{ key: "schedule.view", label: "Xem lịch" }],
    nav: [{ href: "/admin/schedule", label: "Lịch", icon: "calendar", permission: "schedule.view" }],
  },
  // Các module ngành khác (table, room, menu, spa-service) dùng chung engine booking_requests
  // và được bổ sung theo cùng khuôn manifest này.
];

/** Module lõi + module do plugin ngành đóng góp (vd: tour, kế toán) */
export const MODULES: ModuleManifest[] = [...CORE_MODULES, ...PLUGINS.flatMap((p) => p.modules ?? [])];

export const ALL_PERMISSIONS = MODULES.flatMap((m) => m.permissions.map((p) => ({ ...p, module: m.key })));

export function getModule(key: string) {
  return MODULES.find((m) => m.key === key);
}

/** Quyền dạng "booking.handle:tenant". Không ghi scope => tenant. */
export function parsePermission(raw: string): { key: string; scope: Scope } {
  const [key, scope] = raw.split(":");
  return { key, scope: (scope as Scope) || "tenant" };
}

export function hasPermission(perms: string[] | undefined, key: string): boolean {
  if (!perms) return false;
  return perms.some((p) => p === "*" || parsePermission(p).key === key);
}

export function permissionScope(perms: string[] | undefined, key: string): Scope | null {
  if (!perms) return null;
  if (perms.includes("*")) return "tenant";
  const order: Scope[] = ["tenant", "branch", "own"];
  const scopes = perms.map(parsePermission).filter((p) => p.key === key).map((p) => p.scope);
  return order.find((s) => scopes.includes(s)) ?? null;
}
