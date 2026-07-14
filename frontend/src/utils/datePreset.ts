// Bộ lọc thời gian – dùng chung cho Dashboard, PurchaseOrder, WarehouseReceipt
export type DatePreset = "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "custom";

export const DATE_PRESET_OPTIONS: { value: DatePreset | ""; label: string }[] = [
  { value: "", label: "Tất cả thời gian" },
  { value: "thisWeek", label: "Tuần này" },
  { value: "lastWeek", label: "Tuần trước" },
  { value: "thisMonth", label: "Tháng này" },
  { value: "lastMonth", label: "Tháng trước" },
  { value: "custom", label: "Tự chọn..." },
];

/** Định dạng Date thành "YYYY-MM-DD" theo múi giờ local. */
export function toDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Tính khoảng ngày cho preset định sẵn.
 * Tuần tính từ Thứ Hai (ISO 8601).
 */
export function getDateRangeForPreset(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=CN, 1=T2, ..., 6=T7
  // Offset để về Thứ Hai
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  if (preset === "thisWeek") {
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: toDateString(monday), to: toDateString(sunday) };
  }

  if (preset === "lastWeek") {
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() + mondayOffset - 7);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    return { from: toDateString(lastMonday), to: toDateString(lastSunday) };
  }

  if (preset === "thisMonth") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toDateString(first), to: toDateString(last) };
  }

  if (preset === "lastMonth") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toDateString(first), to: toDateString(last) };
  }

  // "custom" — caller tự xử lý
  return { from: "", to: "" };
}

/** Chuyển "YYYY-MM-DD" sang ISO LocalDateTime với giờ 00:00:00 hoặc 23:59:59. */
export function toIsoLocal(dateStr: string, endOfDay: boolean): string {
  return `${dateStr}T${endOfDay ? "23:59:59" : "00:00:00"}`;
}

/** Định dạng thời gian hiện tại theo múi giờ trình duyệt (không có UTC offset). */
export function nowLocalIsoString(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  );
}
