import { apiFetch } from "./api";
import type { ApiResponse } from "../types/common.types";
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
} from "../types/purchaseOrder.types";



// Chi tiết đơn đặt hàng từ backend
export interface BackendPurchaseOrderDetailResponse {
  id: number;
  variantId: number;
  sku: string;
  productName: string;
  option1Value: string | null;
  option2Value: string | null;
  option3Value: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

// Đơn đặt hàng từ backend
export interface BackendPurchaseOrderResponse {
  id: number;
  code: string;
  supplierId: number;
  supplierName: string;
  createdById: number;
  createdByName: string;
  orderDate: string;
  receivedDate: string | null;
  totalAmount: number;
  totalQuantity: number;
  paymentStatus: string;

  status: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  details: BackendPurchaseOrderDetailResponse[];
}

// Phân trang đơn đặt hàng từ backend
export interface PaginatedPurchaseOrdersResponse {
  items: BackendPurchaseOrderResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// Phân trang đơn đặt hàng ở frontend
export interface PaginatedPurchaseOrders {
  items: PurchaseOrder[];
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

// Dữ liệu tạo đơn đặt hàng
export interface PurchaseOrderCreateRequestDto {
  supplierId: number;
  orderDate: string;
  note?: string;
  details: {
    variantId: number;
    quantity: number;
    unitPrice: number;
  }[];
}

// Dữ liệu cập nhật trạng thái đơn đặt hàng
export interface PurchaseOrderStatusUpdateDto {
  status: PurchaseOrderStatus;
}



export function mapBackendOrderToFrontend(
  o: BackendPurchaseOrderResponse,
): PurchaseOrder {
  return {
    id: String(o.id),
    code: o.code,
    supplierId: String(o.supplierId),
    supplierName: o.supplierName,
    createdById: String(o.createdById),
    createdByName: o.createdByName,
    orderDate: o.orderDate || "",
    receivedDate: o.receivedDate ?? null,
    totalAmount: Number(o.totalAmount) || 0,
    totalQuantity: o.totalQuantity ?? 0,

    paymentStatus: (o.paymentStatus as PurchaseOrder["paymentStatus"]) ?? "UNPAID",
    status: (o.status as PurchaseOrder["status"]) ?? "DRAFT",
    note: o.note || "",
    createdAt: o.createdAt || "",
    updatedAt: o.updatedAt || "",
    details: (o.details || []).map((d) => ({
      id: String(d.id),
      variantId: String(d.variantId),
      sku: d.sku,
      productName: d.productName || "",
      option1Value: d.option1Value ?? null,
      option2Value: d.option2Value ?? null,
      option3Value: d.option3Value ?? null,
      quantity: d.quantity,
      unitPrice: Number(d.unitPrice) || 0,
      lineTotal: Number(d.lineTotal) || 0,
    })),
  };
}



// Lấy danh sách đơn đặt hàng phân trang
export async function getPurchaseOrdersPage(
  page: number,
  keyword?: string,
  status?: string,
  sortBy?: string,
  sortDir?: "asc" | "desc",
  fromDate?: string,
  toDate?: string,
  supplierId?: number,
): Promise<PaginatedPurchaseOrders> {
  const params = new URLSearchParams({ page: String(page) });
  if (keyword) params.set("keyword", keyword);
  if (status) params.set("status", status.toUpperCase());
  if (sortBy) params.set("sortBy", sortBy);
  if (sortDir) params.set("sortDirection", sortDir);
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);
  if (supplierId) params.set("supplierId", String(supplierId));
  const url = `/purchase-orders?${params.toString()}`;

  const response = await apiFetch<ApiResponse<PaginatedPurchaseOrdersResponse>>(url);
  const data = response.data;

  return {
    items: (data.items || []).map(mapBackendOrderToFrontend),
    page: data.page,
    pageSize: data.size,
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}

// Lấy danh sách phiếu nhập kho phân trang
export async function getReceivedPurchaseOrdersPage(
  page: number,
  keyword?: string,
  sortBy?: string,
  sortDir?: "asc" | "desc",
  fromDate?: string,
  toDate?: string,
  supplierId?: number,
): Promise<PaginatedPurchaseOrders> {
  const params = new URLSearchParams({ page: String(page) });
  if (keyword) params.set("keyword", keyword);
  if (sortBy)  params.set("sortBy", sortBy);
  if (sortDir) params.set("sortDirection", sortDir);
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate)   params.set("toDate", toDate);
  if (supplierId) params.set("supplierId", String(supplierId));
  const url = `/purchase-orders/received?${params.toString()}`;

  const response = await apiFetch<ApiResponse<PaginatedPurchaseOrdersResponse>>(url);
  const data = response.data;

  return {
    items: (data.items || []).map(mapBackendOrderToFrontend),
    page: data.page,
    pageSize: data.size,
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}


// Lấy chi tiết đơn đặt hàng theo ID
export async function getPurchaseOrderById(
  id: string,
): Promise<PurchaseOrder> {
  const response = await apiFetch<ApiResponse<BackendPurchaseOrderResponse>>(
    `/purchase-orders/${id}`,
  );
  return mapBackendOrderToFrontend(response.data);
}

// Cập nhật đơn đặt hàng (chỉ cho phép khi ở trạng thái nháp)
export async function updatePurchaseOrder(
  id: string,
  payload: PurchaseOrderCreateRequestDto,
): Promise<PurchaseOrder> {
  const response = await apiFetch<ApiResponse<BackendPurchaseOrderResponse>>(
    `/purchase-orders/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
  return mapBackendOrderToFrontend(response.data);
}


export async function createPurchaseOrder(
  payload: PurchaseOrderCreateRequestDto,
): Promise<PurchaseOrder> {
  const response = await apiFetch<ApiResponse<BackendPurchaseOrderResponse>>(
    "/purchase-orders",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return mapBackendOrderToFrontend(response.data);
}

// Cập nhật trạng thái đơn đặt hàng
export async function updatePurchaseOrderStatus(
  id: string,
  status: PurchaseOrderStatus,
): Promise<PurchaseOrder> {
  const response = await apiFetch<ApiResponse<BackendPurchaseOrderResponse>>(
    `/purchase-orders/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status } satisfies PurchaseOrderStatusUpdateDto),
    },
  );
  return mapBackendOrderToFrontend(response.data);
}
