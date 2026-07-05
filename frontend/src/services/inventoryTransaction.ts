import { apiFetch } from "./api";
import type { ApiResponse } from "../types/common.types";

export interface InventoryTransactionDto {
  id: number;
  variantId: number;
  sku: string;
  purchaseOrderDetailId: number | null;
  purchaseOrderCode: string | null;
  transactionType: string; // "IN" | "OUT" | "ADJUSTMENT" | ...
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  note: string | null;
  createdBy: number;
  createdByName: string | null;
  createdAt: string;
}

interface PageResponseDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

interface BackendPageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export async function getTransactionsByVariantId(
  variantId: string | number,
  page: number = 1,
): Promise<PageResponseDto<InventoryTransactionDto>> {
  const params = new URLSearchParams({ page: String(page) });
  const url = `/inventory-transactions/variant/${variantId}?${params.toString()}`;

  const response = await apiFetch<ApiResponse<BackendPageResponse<InventoryTransactionDto>>>(url);
  const data = response.data;

  return {
    items: data.items || [],
    page: data.page,
    pageSize: data.size,
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}
