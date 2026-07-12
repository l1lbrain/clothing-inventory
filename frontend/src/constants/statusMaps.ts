// Constants dùng chung – tránh copy-paste giữa các file

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "Chưa thanh toán",
  PARTIALLY_PAID: "Thanh toán một phần",
  PAID: "Đã thanh toán",
};

export const PAYMENT_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  PAID: { bg: "#dcfce7", text: "#166534" },
  PARTIALLY_PAID: { bg: "#fef9c3", text: "#854d0e" },
  UNPAID: { bg: "#fee2e2", text: "#991b1b" },
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Nháp",
  PENDING: "Chờ nhập",
  RECEIVED: "Đã nhận hàng",
  CANCELLED: "Đã huỷ",
};

export const ORDER_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: "#eff6ff", text: "#1d4ed8" },
  PENDING: { bg: "#fef3c7", text: "#d97706" },
  RECEIVED: { bg: "#dcfce7", text: "#166534" },
  CANCELLED: { bg: "#fee2e2", text: "#991b1b" },
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Quản trị viên",
  coordinator: "Nhân viên điều phối",
  "warehouse-staff": "Nhân viên kho",
  "store-keeper": "Thủ kho",
};

export const ASSIGNABLE_ROLES: Record<string, string> = {
  coordinator: "Nhân viên điều phối",
  "warehouse-staff": "Nhân viên kho",
  "store-keeper": "Thủ kho",
};

export const PRODUCT_STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "ACTIVE", label: "Đang bán" },
  { value: "INACTIVE", label: "Ngừng bán" },
] as const;

export const VARIANT_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Đang bán" },
  { value: "INACTIVE", label: "Ngừng bán" },
] as const;

export const SUPPLIER_STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Ngừng hoạt động" },
] as const;

export const USER_STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Vô hiệu hóa" },
] as const;

export const PURCHASE_ORDER_STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "DRAFT", label: "Nháp" },
  { value: "PENDING", label: "Chờ nhập" },
  { value: "RECEIVED", label: "Đã nhận hàng" },
  { value: "CANCELLED", label: "Đã huỷ" },
] as const;
