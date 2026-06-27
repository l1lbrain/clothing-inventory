import type { PaymentStatus, PaymentMethod } from "./common.types";

export interface ReceiptItem {
  id: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface WarehouseReceipt {
  id: string;
  code: string;
  supplierId: string;
  supplierName: string;
  items: ReceiptItem[];
  totalQuantity: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  remainingAmount: number;
  note: string;
  createdAt: string;
  confirmedAt: string | null;
  isDraft: boolean;
}

export interface PaymentRecord {
  id: string;
  receiptCode: string;
  supplierName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
}
