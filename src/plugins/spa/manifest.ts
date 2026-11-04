import type { PluginManifest } from "../types";

export const plugin: PluginManifest = {
  key: "spa",
  name: "Spa – Làm đẹp",
  description: "Dịch vụ có thời lượng, đặt lịch theo khung giờ trống, kỹ thuật viên, giường/phòng",
  industry: {
    engine: "slots",
    modules: ["core", "booking", "crm", "hr", "invoice", "catalog", "resource", "schedule"],
    labels: { booking: "Đặt lịch", resource: "Giường / phòng", item: "Dịch vụ", staff: "Kỹ thuật viên", catalogNav: "Dịch vụ", resourceNav: "Giường & KTV" },
    booking: { open: "09:00", close: "21:00", step: 30, durationMin: 60, needsBed: true },
    color: "#be185d",
    tagline: "Thư giãn trọn vẹn – Chăm sóc từ tâm",
    heroText: "Chọn dịch vụ, xem giờ còn trống và đặt lịch trong 30 giây. Lễ tân gọi xác nhận trước khi bạn đến.",
    icon: "sparkles",
  },
};
