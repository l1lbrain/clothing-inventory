import { apiFetch } from "./api";
import type { ApiResponse } from "../types/common.types";

export interface DashboardResponseDto {
  totalAmount: number;
  totalProduct: number;
  totalSupplier: number;
  totalInventory: number;
}

export async function getDashboardStats(): Promise<DashboardResponseDto> {
  const response = await apiFetch<ApiResponse<DashboardResponseDto>>("/dashboard");
  return response.data;
}
