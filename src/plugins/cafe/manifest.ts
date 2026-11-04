import type { PluginManifest } from "../types";

export const plugin: PluginManifest = {
  key: "cafe",
  name: "Quán cà phê",
  description: "Menu online, sơ đồ bàn theo khu vực, đặt bàn xem bàn trống theo giờ",
  industry: {
    engine: "tables",
    modules: ["core", "booking", "crm", "hr", "invoice", "catalog", "resource", "schedule"],
    labels: { booking: "Đặt bàn", resource: "Bàn", item: "Món", catalogNav: "Menu", resourceNav: "Sơ đồ bàn" },
    booking: { open: "07:00", close: "22:30", step: 30, durationMin: 90 },
    color: "#92400e",
    tagline: "Góc nhỏ bình yên giữa phố",
    heroText: "Xem menu, chọn giờ đến và chọn bàn còn trống ngay trên sơ đồ. Quán gọi xác nhận để giữ bàn cho bạn.",
    icon: "coffee",
  },
};
