export type Status = "active" | "inactive";

export type PaymentStatus = "paid" | "partial" | "unpaid";

export type PaymentMethod = "cash" | "transfer" | "debt";

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (value: unknown, row: T) => React.ReactNode;
}
