import type { PluginManifest } from "../types";

export const plugin: PluginManifest = {
  key: "hotel",
  name: "Khách sạn – Homestay",
  description: "Loại phòng, phòng, xem phòng trống theo ngày nhận/trả, sơ đồ trạng thái phòng",
  industry: {
    engine: "rooms",
    modules: ["core", "booking", "crm", "hr", "invoice", "catalog", "resource", "schedule"],
    labels: { booking: "Đặt phòng", resource: "Phòng", item: "Loại phòng", catalogNav: "Loại phòng", resourceNav: "Sơ đồ phòng" },
    booking: { open: "14:00", close: "12:00", step: 60, durationMin: 0 },
    color: "#0f766e",
    tagline: "Nghỉ ngơi như ở nhà",
    heroText: "Chọn ngày nhận – trả phòng để xem ngay loại phòng còn trống. Lễ tân gọi xác nhận và gửi QR đặt cọc.",
    icon: "bed",
  },
};
