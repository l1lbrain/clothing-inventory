import type { PurchaseOrder } from "../../../types/purchaseOrder.types";
import { Button } from "../../../components/Button/Button";
import { formatCurrency, formatDateTime } from "../../../utils/formatters";
import styles from "./ReceiptDetailView.module.css";

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "Chưa thanh toán",
  PARTIALLY_PAID: "Thanh toán một phần",
  PAID: "Đã thanh toán",
};

const PAYMENT_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  PAID: { bg: "#dcfce7", text: "#166534" },
  PARTIALLY_PAID: { bg: "#fef9c3", text: "#854d0e" },
  UNPAID: { bg: "#fee2e2", text: "#991b1b" },
};

function formatVariantName(
  productName: string,
  option1: string | null,
  option2: string | null,
  option3: string | null,
): string {
  const opts = [option1, option2, option3]
    .filter((o): o is string => Boolean(o?.trim()))
    .join(" / ");
  return opts ? `${productName} ${opts}` : productName;
}

interface Props {
  receipt: PurchaseOrder;
  onClose: () => void;
  onPay: () => void;
  onSupplierClick?: (supplierId: string) => void;
  onVariantClick?: (variantId: string) => void;
}

export function ReceiptDetailView({ receipt, onClose, onPay, onSupplierClick, onVariantClick }: Props) {
  const payStatus = PAYMENT_STATUS_LABEL[receipt.paymentStatus] ?? receipt.paymentStatus;
  const payColor = PAYMENT_STATUS_COLOR[receipt.paymentStatus] ?? { bg: "#fee2e2", text: "#991b1b" };
  const isPaid = receipt.paymentStatus === "PAID";

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.code}>{receipt.code}</div>
          <div className={styles.supplier}>
            {onSupplierClick ? (
              <button className={styles.clickableLink} onClick={() => onSupplierClick(receipt.supplierId)}>
                {receipt.supplierName}
              </button>
            ) : (
              receipt.supplierName
            )}
          </div>
        </div>
        <span className={styles.badge} style={{ background: payColor.bg, color: payColor.text }}>
          {payStatus}
        </span>
      </div>

      {/* Meta */}
      <div className={styles.meta}>
        <span><i className="fi fi-rr-calendar" style={{ marginRight: 4 }} />Ngày đặt: {formatDateTime(receipt.orderDate)}</span>
        {receipt.receivedDate && (
          <span><i className="fi fi-rr-box-check" style={{ marginRight: 4 }} />Ngày nhập: {formatDateTime(receipt.receivedDate)}</span>
        )}
        {receipt.note && <span><i className="fi fi-rr-note" style={{ marginRight: 4 }} />Ghi chú: {receipt.note}</span>}
      </div>

      {/* Items table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th>SKU</th>
            <th style={{ textAlign: "right", width: 80 }}>SL</th>
            <th style={{ textAlign: "right", width: 130 }}>Đơn giá</th>
            <th style={{ textAlign: "right", width: 130 }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {receipt.details.map((item) => (
            <tr key={item.id}>
              <td>{formatVariantName(item.productName, item.option1Value, item.option2Value, item.option3Value)}</td>
              <td className={styles.skuCell}>
                {onVariantClick ? (
                  <button className={styles.clickableLink} onClick={() => onVariantClick(item.variantId)}>
                    {item.sku}
                  </button>
                ) : (
                  item.sku
                )}
              </td>
              <td style={{ textAlign: "right" }}>{item.quantity}</td>
              <td style={{ textAlign: "right" }}>{formatCurrency(item.unitPrice)}</td>
              <td style={{ textAlign: "right" }} className={styles.totalCell}>{formatCurrency(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div className={styles.total}>
        <span>Tổng tiền:</span>
        <span className={styles.totalAmount}>{formatCurrency(receipt.totalAmount)}</span>
      </div>

      {/* Actions */}
      <div className={styles.footer}>
        <Button variant="secondary" onClick={onClose}>Đóng</Button>
        <Button
          variant={isPaid ? "secondary" : "primary"}
          icon={isPaid ? "fi fi-rr-list" : "fi fi-rr-credit-card"}
          onClick={onPay}
        >
          {isPaid ? "Lịch sử thanh toán" : "Thanh toán"}
        </Button>
      </div>
    </div>
  );
}
