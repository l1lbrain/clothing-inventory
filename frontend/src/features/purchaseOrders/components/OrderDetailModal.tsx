import type { PurchaseOrder } from "../../../types/purchaseOrder.types";
import { Modal } from "../../../components/Modal/Modal";
import { Button } from "../../../components/Button/Button";
import { formatCurrency, formatDateTime } from "../../../utils/formatters";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "../../../constants/statusMaps";
import styles from "./OrderDetailModal.module.css";

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
  order: PurchaseOrder | null;
  onClose: () => void;
  onEdit?: (order: PurchaseOrder) => void;
  onApprove?: (id: string) => void;
  onReceive?: (id: string) => void;
  onCancel?: (id: string) => void;
  onSupplierClick?: (id: string) => void;
  onVariantClick?: (id: string) => void;
  onUserClick?: (id: string, name: string) => void;
  /** Khi true, ẩn toàn bộ action buttons (chỉ xem) */
  readOnly?: boolean;
  /** variantId cần highlight trong bảng sản phẩm (khi đơn có >= 2 biến thể) */
  highlightVariantId?: string;
}

export function OrderDetailModal({
  order, onClose, onEdit, onApprove, onReceive, onCancel,
  onSupplierClick, onVariantClick, onUserClick,
  readOnly = false,
  highlightVariantId,
}: Props) {
  if (!order) return null;

  const statusColor = ORDER_STATUS_COLOR[order.status] ?? { bg: "#f3f4f6", text: "#374151" };

  return (
    <Modal isOpen={!!order} onClose={onClose} title="Chi tiết đơn đặt hàng" size="lg">
      <div className={styles.wrapper}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.code}>{order.code}</div>
            <div className={styles.supplier}>
              {onSupplierClick ? (
                <button className={styles.clickableLink} onClick={() => onSupplierClick(order.supplierId)}>
                  {order.supplierName}
                </button>
              ) : (
                <span>{order.supplierName}</span>
              )}
            </div>
          </div>
          <span className={styles.badge} style={{ background: statusColor.bg, color: statusColor.text }}>
            {ORDER_STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>

        {/* Meta */}
        <div className={styles.meta}>
          <span><i className="fi fi-rr-calendar" style={{ marginRight: 4 }} />Ngày đặt: {formatDateTime(order.orderDate)}</span>
          {order.receivedDate && (
            <span><i className="fi fi-rr-box-check" style={{ marginRight: 4 }} />Ngày nhận: {formatDateTime(order.receivedDate)}</span>
          )}
          <span>
            <i className="fi fi-rr-user" style={{ marginRight: 4 }} />Người tạo:{" "}
            {onUserClick ? (
              <button className={styles.clickableLink} onClick={() => onUserClick(order.createdById, order.createdByName)}>
                {order.createdByName}
              </button>
            ) : (
              <span>{order.createdByName}</span>
            )}
          </span>
          {order.note && <span><i className="fi fi-rr-note" style={{ marginRight: 4 }} />Ghi chú: {order.note}</span>}
        </div>

        {/* Items table */}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>SKU</th>
              <th style={{ textAlign: "right", width: 60 }}>SL</th>
              <th style={{ textAlign: "right", width: 130 }}>Đơn giá</th>
              <th style={{ textAlign: "right", width: 130 }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {order.details.map((item) => {
              const isHighlighted =
                highlightVariantId !== undefined &&
                order.details.length >= 2 &&
                item.variantId === highlightVariantId;
              return (
                <tr
                  key={item.id}
                  className={isHighlighted ? styles.highlightRow : undefined}
                >
                  <td>
                    {isHighlighted && (
                      <span className={styles.highlightBadge}>Đang xem</span>
                    )}
                    {formatVariantName(item.productName, item.option1Value, item.option2Value, item.option3Value)}
                  </td>
                  <td className={styles.skuCell}>
                    {onVariantClick && !readOnly ? (
                      <button className={styles.clickableLink} onClick={() => onVariantClick(item.variantId)}>
                        {item.sku}
                      </button>
                    ) : (
                      <span>{item.sku}</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>{item.quantity}</td>
                  <td style={{ textAlign: "right" }}>{formatCurrency(item.unitPrice)}</td>
                  <td style={{ textAlign: "right" }} className={styles.totalCell}>{formatCurrency(item.lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Total */}
        <div className={styles.total}>
          <span>Tổng tiền:</span>
          <span className={styles.totalAmount}>{formatCurrency(order.totalAmount)}</span>
        </div>

        {/* Actions */}
        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>Đóng</Button>
          {!readOnly && order.status !== "RECEIVED" && (
            <>
              {(order.status === "DRAFT" || order.status === "PENDING") && onEdit && (
                <Button variant="secondary" icon="fi fi-rr-edit" onClick={() => onEdit(order)}>Sửa</Button>
              )}
              {order.status === "DRAFT" && onApprove && (
                <Button icon="fi fi-rr-check" onClick={() => onApprove(order.id)}>Duyệt</Button>
              )}
              {order.status === "PENDING" && onReceive && (
                <Button icon="fi fi-rr-box-check" onClick={() => onReceive(order.id)}>Nhập hàng</Button>
              )}
              {order.status !== "CANCELLED" && onCancel && (
                <Button variant="danger" icon="fi fi-rr-cross-circle" onClick={() => onCancel(order.id)}>Huỷ đơn</Button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
