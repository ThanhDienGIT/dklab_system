import type { PluginManifest } from "../types";

export const plugin: PluginManifest = {
  key: "restaurant",
  name: "Nhà hàng",
  description: "Menu, sơ đồ bàn, đặt bàn kèm chọn món trước",
  industry: {
    engine: "tables",
    modules: ["core", "booking", "crm", "hr", "invoice", "catalog", "resource", "schedule"],
    labels: { booking: "Đặt bàn", resource: "Bàn", item: "Món", catalogNav: "Thực đơn", resourceNav: "Sơ đồ bàn" },
    booking: { open: "10:00", close: "22:00", step: 30, durationMin: 120, preorder: true },
    color: "#b91c1c",
    tagline: "Hương vị Việt – Đậm đà từng món",
    heroText: "Đặt bàn, chọn món trước để bếp chuẩn bị sẵn. Nhân viên gọi xác nhận trong vài phút.",
    icon: "utensils",
  },
};
