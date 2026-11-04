import type { PluginManifest } from "../types";

export const plugin: PluginManifest = {
  key: "accounting",
  name: "Dịch vụ kế toán",
  description: "Gói dịch vụ, lịch tư vấn, hợp đồng khách doanh nghiệp, nhắc hạn kê khai thuế, hóa đơn phí tháng",
  industry: {
    engine: "slots",
    modules: ["core", "booking", "crm", "hr", "invoice", "catalog", "resource", "schedule", "accounting"],
    labels: { booking: "Đặt lịch tư vấn", resource: "Phòng họp", item: "Gói dịch vụ", staff: "Chuyên viên", catalogNav: "Gói dịch vụ", resourceNav: "Chuyên viên" },
    booking: { open: "08:00", close: "17:30", step: 30, durationMin: 60, needsBed: false },
    color: "#1d4ed8",
    tagline: "Sổ sách gọn gàng – Thuế đúng hạn",
    heroText: "Chọn gói dịch vụ hoặc đặt lịch tư vấn miễn phí 30 phút. Chuyên viên gọi lại xác nhận trong giờ hành chính.",
    icon: "calculator",
  },
  modules: [
    {
      key: "accounting",
      name: "Hợp đồng & lịch thuế",
      description: "Hợp đồng dịch vụ với khách doanh nghiệp, nhắc hạn kê khai thuế, lập hóa đơn phí tháng",
      permissions: [
        { key: "contract.view", label: "Xem hợp đồng & lịch thuế" },
        { key: "contract.manage", label: "Thêm / sửa hợp đồng, lập hóa đơn phí" },
        { key: "tax.manage", label: "Cập nhật trạng thái kê khai thuế" },
      ],
      nav: [
        { href: "/admin/contracts", label: "Hợp đồng", icon: "file", permission: "contract.view" },
        { href: "/admin/tax", label: "Lịch kê khai thuế", icon: "calendar", permission: "contract.view" },
      ],
    },
  ],
};
