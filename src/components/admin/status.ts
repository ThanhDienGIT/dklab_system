export const BOOKING_STATUS: Record<string, { label: string; color: string }> = {
  new: { label: "Mới – chờ gọi", color: "red" },
  contacted: { label: "Đã liên hệ", color: "amber" },
  confirmed: { label: "Đã xác nhận", color: "green" },
  completed: { label: "Hoàn tất", color: "blue" },
  cancelled: { label: "Đã hủy", color: "slate" },
};
export const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: "Nháp", color: "slate" },
  issued: { label: "Chờ thanh toán", color: "amber" },
  paid: { label: "Đã thanh toán", color: "green" },
  cancelled: { label: "Đã hủy", color: "slate" },
};
export const EINVOICE_STATUS: Record<string, { label: string; color: string }> = {
  none: { label: "Chưa xuất HĐĐT", color: "slate" },
  created: { label: "Đã đẩy MISA – chờ ký", color: "blue" },
  published: { label: "Đã phát hành HĐĐT", color: "green" },
  error: { label: "Lỗi MISA", color: "red" },
};
