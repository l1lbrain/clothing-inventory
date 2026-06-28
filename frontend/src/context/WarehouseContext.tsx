import { createContext, useState, useCallback, type ReactNode } from "react";
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
  WarehouseReceipt,
  ReceiptItem,
} from "../types/payment.types";
import type { PaymentMethod } from "../types/common.types";
import { MOCK_RECEIPTS } from "../data/payments.mock";

interface WarehouseContextValue {
  purchaseOrders: PurchaseOrder[];
  warehouseReceipts: WarehouseReceipt[];

  addPurchaseOrder: (order: Omit<PurchaseOrder, "id" | "code" | "createdAt" | "approvedAt" | "status">) => void;
  updatePurchaseOrderStatus: (id: string, status: PurchaseOrderStatus) => void;
  editPurchaseOrder: (id: string, updates: Partial<Pick<PurchaseOrder, "supplierId" | "supplierName" | "items" | "totalQuantity" | "totalAmount" | "note">>) => void;
  importOrder: (orderId: string) => void;

  addWarehouseReceipt: (receipt: Omit<WarehouseReceipt, "id" | "code" | "createdAt" | "paidAmount" | "remainingAmount" | "paymentStatus" | "paymentMethod" | "confirmedAt">) => void;
  updatePayment: (receiptId: string, amount: number, method: PaymentMethod) => void;
}

const WarehouseContext = createContext<WarehouseContextValue | null>(null);

export function WarehouseContextProvider({ children }: { children: ReactNode }) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
    {
      id: "po-1",
      code: "DDH-2026-001",
      supplierId: "1",
      supplierName: "Công ty TNHH Thời Trang Việt",
      items: [
        { id: "i1", sku: "AO-001", productName: "Áo sơ mi trắng công sở", quantity: 50, unitPrice: 150000, totalPrice: 7500000 },
      ],
      totalQuantity: 50,
      totalAmount: 7500000,
      status: "PENDING",
      note: "",
      createdAt: "2026-06-20",
      approvedAt: null,
    },
    {
      id: "po-2",
      code: "DDH-2026-002",
      supplierId: "2",
      supplierName: "Xưởng May Phương Nam",
      items: [
        { id: "i2", sku: "DM-001", productName: "Đầm maxi hoa nhí", quantity: 40, unitPrice: 180000, totalPrice: 7200000 },
      ],
      totalQuantity: 40,
      totalAmount: 7200000,
      status: "APPROVED",
      note: "Ưu tiên giao nhanh",
      createdAt: "2026-06-22",
      approvedAt: "2026-06-23",
    },
  ]);

  const [warehouseReceipts, setWarehouseReceipts] = useState<WarehouseReceipt[]>(MOCK_RECEIPTS);

  const addPurchaseOrder = useCallback((order: Omit<PurchaseOrder, "id" | "code" | "createdAt" | "approvedAt" | "status">) => {
    const newId = `po-${Date.now()}`;
    const newOrder: PurchaseOrder = {
      ...order,
      id: newId,
      code: `DDH-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      status: "PENDING",
      createdAt: new Date().toISOString().split("T")[0],
      approvedAt: null,
    };
    setPurchaseOrders((prev) => [newOrder, ...prev]);
  }, []);

  const updatePurchaseOrderStatus = useCallback((id: string, status: PurchaseOrderStatus) => {
    setPurchaseOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, status, approvedAt: status === "APPROVED" ? new Date().toISOString().split("T")[0] : o.approvedAt }
          : o
      )
    );
  }, []);

  const editPurchaseOrder = useCallback((id: string, updates: Partial<Pick<PurchaseOrder, "supplierId" | "supplierName" | "items" | "totalQuantity" | "totalAmount" | "note">>) => {
    setPurchaseOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  }, []);

  const importOrder = useCallback((orderId: string) => {
    setPurchaseOrders((prev) => {
      const order = prev.find((o) => o.id === orderId);
      if (!order || order.status !== "APPROVED") return prev;

      // Tạo phiếu nhập kho từ đơn đặt hàng
      const receiptItems: ReceiptItem[] = order.items.map((item) => ({ ...item }));
      const receipt: WarehouseReceipt = {
        id: `wr-${Date.now()}`,
        code: `PNK-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        supplierId: order.supplierId,
        supplierName: order.supplierName,
        items: receiptItems,
        totalQuantity: order.totalQuantity,
        totalAmount: order.totalAmount,
        paymentStatus: "unpaid",
        paymentMethod: "transfer",
        paidAmount: 0,
        remainingAmount: order.totalAmount,
        note: order.note,
        createdAt: new Date().toISOString().split("T")[0],
        confirmedAt: new Date().toISOString().split("T")[0],
        isDraft: false,
        fromOrderId: orderId,
      };

      setWarehouseReceipts((receipts) => [receipt, ...receipts]);

      return prev.map((o) => (o.id === orderId ? { ...o, status: "IMPORTED" as PurchaseOrderStatus } : o));
    });
  }, []);

  const addWarehouseReceipt = useCallback((receiptData: Omit<WarehouseReceipt, "id" | "code" | "createdAt" | "paidAmount" | "remainingAmount" | "paymentStatus" | "paymentMethod" | "confirmedAt">) => {
    const newReceipt: WarehouseReceipt = {
      ...receiptData,
      id: `wr-${Date.now()}`,
      code: `PNK-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      paidAmount: 0,
      remainingAmount: receiptData.totalAmount,
      paymentStatus: "unpaid",
      paymentMethod: "transfer",
      confirmedAt: receiptData.isDraft ? null : new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString().split("T")[0],
    };
    setWarehouseReceipts((prev) => [newReceipt, ...prev]);
  }, []);

  const updatePayment = useCallback((receiptId: string, amount: number, method: PaymentMethod) => {
    setWarehouseReceipts((prev) =>
      prev.map((r) => {
        if (r.id !== receiptId) return r;
        const newPaid = r.paidAmount + amount;
        const newRemain = r.totalAmount - newPaid;
        return {
          ...r,
          paidAmount: newPaid,
          remainingAmount: newRemain,
          paymentMethod: method,
          paymentStatus: newRemain <= 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid",
        };
      })
    );
  }, []);

  return (
    <WarehouseContext.Provider
      value={{
        purchaseOrders,
        warehouseReceipts,
        addPurchaseOrder,
        updatePurchaseOrderStatus,
        editPurchaseOrder,
        importOrder,
        addWarehouseReceipt,
        updatePayment,
      }}
    >
      {children}
    </WarehouseContext.Provider>
  );
}

export type { WarehouseContextValue };
export { WarehouseContext };
