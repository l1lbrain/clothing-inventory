import type { PurchaseOrder } from "../../../types/purchaseOrder.types";
import { Modal } from "../../../components/Modal/Modal";
import { Button } from "../../../components/Button/Button";
import { formatCurrency, formatDateTime } from "../../../utils/formatters";
import { ORDER_STATUS_LABEL } from "../../../constants/statusMaps";
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
  onEdit: (order: PurchaseOrder) => void;
  onApprove: (id: string) => void;
  onReceive: (id: string) => void;
  onCancel: (id: string) => void;
  onSupplierClick: (id: string) => void;
  onVariantClick: (id: string) => void;
  onUserClick: (id: string, name: string) => void;
}

export function OrderDetailModal({
  order, onClose, onEdit, onApprove, onReceive, onCancel,
  onSupplierClick, onVariantClick, onUserClick,
}: Props) {
  if (!order) return null;

  return (
    <Modal isOpen={!!order} onClose={onClose} title="Chi tiết đơn đặt hàng" size="lg">
      <div className={styles.detailSection}>
        <div className={styles.detailHeader}>
          <div>
            <div className={styles.detailCode}>{order.code}</div>
            <div className={styles.detailSupplier}>
              <button className={styles.clickableLink} onClick={() => onSupplierClick(order.supplierId)}>
                {order.supplierName}
              </button>
            </div>
          </div>
          <span className={[styles.badge, styles[order.status]].join(" ")}>
            {ORDER_STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>

        <div className={styles.detailMeta}>
          <span><i className="fi fi-rr-calendar" style={{ marginRight: 4 }} />Ngày đặt hàng: {formatDateTime(order.orderDate)}</span>
          {order.receivedDate && (
            <span><i className="fi fi-rr-box-check" style={{ marginRight: 4 }} />Ngày nhận hàng: {formatDateTime(order.receivedDate)}</span>
          )}
          <span>
            <i className="fi fi-rr-user" style={{ marginRight: 4 }} />Người tạo:{" "}
            <button className={styles.clickableLink} onClick={() => onUserClick(order.createdById, order.createdByName)}>
              {order.createdByName}
            </button>
          </span>
          {order.note && <span><i className="fi fi-rr-note" style={{ marginRight: 4 }} />Ghi chú: {order.note}</span>}
        </div>

        <table className={styles.readonlyTable}>
          <thead>
            <tr>
              <th>Tên sản phẩm</th>
              <th>SKU</th>
              <th style={{ width: 60, textAlign: "right" }}>SL</th>
              <th style={{ width: 130, textAlign: "right" }}>Đơn giá</th>
              <th style={{ width: 130, textAlign: "right" }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {order.details.map((item) => (
              <tr key={item.id}>
                <td>
                  <div style={{ fontWeight: 500, fontSize: "0.85rem" }}>
                    {formatVariantName(item.productName, item.option1Value, item.option2Value, item.option3Value)}
                  </div>
                </td>
                <td style={{ color: "var(--color-subtext)", fontSize: "0.8rem" }}>
                  <button className={styles.clickableLink} onClick={() => onVariantClick(item.variantId)}>
                    {item.sku}
                  </button>
                </td>
                <td style={{ textAlign: "right" }}>{item.quantity}</td>
                <td style={{ textAlign: "right" }}>{formatCurrency(item.unitPrice)}</td>
                <td style={{ textAlign: "right" }} className={styles.amountCell}>{formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.detailTotal}>
          <span>Tổng tiền:</span>
          <span className={styles.detailTotalAmount}>{formatCurrency(order.totalAmount)}</span>
        </div>

        <div className={styles.modalFooter}>
          <Button variant="secondary" onClick={onClose}>Đóng</Button>
          {order.status !== "RECEIVED" && (
            <>
              {(order.status === "DRAFT" || order.status === "PENDING") && (
                <Button variant="secondary" icon="fi fi-rr-edit" onClick={() => onEdit(order)}>Sửa</Button>
              )}
              {order.status === "DRAFT" && (
                <Button icon="fi fi-rr-check" onClick={() => onApprove(order.id)}>Duyệt</Button>
              )}
              {order.status === "PENDING" && (
                <Button icon="fi fi-rr-box-check" onClick={() => onReceive(order.id)}>Nhập hàng</Button>
              )}
              {order.status !== "CANCELLED" && (
                <Button variant="danger" icon="fi fi-rr-cross-circle" onClick={() => onCancel(order.id)}>Huỷ đơn</Button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
