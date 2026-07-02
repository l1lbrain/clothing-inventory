// Đồng bộ với enum PurchaseOrderStatus (backend)
export type PurchaseOrderStatus = "DRAFT" | "PENDING" | "RECEIVED" | "CANCELLED";


// Đồng bộ với enum PurchaseOrderPaymentStatus (backend)
export type PurchaseOrderPaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

// Ánh xạ PurchaseOrderDetailResponseDto
export interface PurchaseOrderDetail {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  option1Value: string | null;
  option2Value: string | null;
  option3Value: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

// Ánh xạ PurchaseOrderResponseDto — entity hiển thị trên UI
export interface PurchaseOrder {
  id: string;
  code: string;
  supplierId: string;
  supplierName: string;
  createdById: string;
  createdByName: string;
  orderDate: string;
  receivedDate: string | null;
  totalAmount: number;
  totalQuantity: number;

  paymentStatus: PurchaseOrderPaymentStatus;
  status: PurchaseOrderStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
  details: PurchaseOrderDetail[];
}

// Dữ liệu một dòng hàng trong form tạo đơn
export interface PurchaseOrderDetailFormData {
  variantId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

// Dữ liệu form tạo đơn đặt hàng
export interface PurchaseOrderFormData {
  supplierId: string;
  orderDate: string;
  note: string;
  details: PurchaseOrderDetailFormData[];
}
