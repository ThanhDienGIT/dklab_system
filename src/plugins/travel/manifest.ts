import type { PluginManifest } from "../types";

export const plugin: PluginManifest = {
  key: "travel",
  name: "Du lịch – Lữ hành",
  description: "Tour, lịch trình, lịch khởi hành, số chỗ còn trống",
  industry: {
    engine: "tours",
    modules: ["core", "booking", "crm", "hr", "invoice", "tour"],
    labels: { booking: "Đặt tour", resource: "Tour", item: "Tour", catalogNav: "Tour du lịch", resourceNav: "Tour du lịch" },
    booking: { open: "08:00", close: "21:00", step: 30, durationMin: 0 },
    color: "#0369a1",
    tagline: "Hành trình trọn vẹn – Giá minh bạch – Hỗ trợ 24/7",
    heroText: "Chọn tour, để lại số điện thoại. Nhân viên gọi xác nhận chỗ và gửi mã QR thanh toán.",
    icon: "map",
  },
  modules: [
    {
      key: "tour",
      name: "Du lịch – Tour",
      description: "Tour, lịch khởi hành, số chỗ, giá người lớn / trẻ em",
      permissions: [
        { key: "tour.view", label: "Xem tour" },
        { key: "tour.manage", label: "Thêm / sửa tour & lịch khởi hành" },
      ],
      nav: [{ href: "/admin/tours", label: "Tour du lịch", icon: "map", permission: "tour.view" }],
    },
  ],
};
