import { useState } from "react";
import type { WarehouseReceipt } from "../../../types/payment.types";
import { Input } from "../../../components/Input/Input";
import { Button } from "../../../components/Button/Button";
import { Card, CardHeader, CardBody } from "../../../components/Card/Card";
import { Modal } from "../../../components/Modal/Modal";
import { Table } from "../../../components/Table/Table";
import { formatCurrency, formatDate } from "../../../utils/formatters";
import { useWarehouseContext } from "../../../hooks/useWarehouseContext";
import type { TableColumn, PaymentMethod } from "../../../types/common.types";
import styles from "./WarehouseReceipt.module.css";

const RECEIPT_STATUS_LABEL: Record<string, string> = {
  paid: "Đã thanh toán",
  partial: "Thanh toán một phần",
  unpaid: "Chưa thanh toán",
};

const METHOD_LABEL: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  debt: "Công nợ",
};

// ---- Receipt Detail (read-only for order-based receipts) ----
function ReceiptDetailView({ receipt, onClose }: { receipt: WarehouseReceipt; onClose: () => void }) {
  const payStatusLabel = RECEIPT_STATUS_LABEL[receipt.paymentStatus] ?? receipt.paymentStatus;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem" }}>{receipt.code}</div>
          <div style={{ color: "var(--color-subtext)", fontSize: "0.875rem", marginTop: 4 }}>{receipt.supplierName}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <span style={{ background: receipt.paymentStatus === "paid" ? "#dcfce7" : receipt.paymentStatus === "partial" ? "#fef9c3" : "#fee2e2", color: receipt.paymentStatus === "paid" ? "#166534" : receipt.paymentStatus === "partial" ? "#854d0e" : "#991b1b", padding: "3px 10px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 }}>
            {payStatusLabel}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, fontSize: "0.8rem", color: "var(--color-subtext)" }}>
        <span>Ngày tạo: {formatDate(receipt.createdAt)}</span>
        {receipt.confirmedAt && <span>Ngày xác nhận: {formatDate(receipt.confirmedAt)}</span>}
        {receipt.note && <span>Ghi chú: {receipt.note}</span>}
        {receipt.isDraft && <span style={{ color: "var(--color-warning, #f59e0b)", fontWeight: 600 }}>• Nháp</span>}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <thead>
          <tr style={{ background: "var(--color-bg)" }}>
            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "var(--color-subtext)", borderBottom: "1px solid var(--color-border)", fontSize: "0.8rem" }}>Sản phẩm</th>
            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "var(--color-subtext)", borderBottom: "1px solid var(--color-border)", fontSize: "0.8rem" }}>SKU</th>
            <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--color-subtext)", borderBottom: "1px solid var(--color-border)", fontSize: "0.8rem", width: 80 }}>SL</th>
            <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--color-subtext)", borderBottom: "1px solid var(--color-border)", fontSize: "0.8rem", width: 130 }}>Đơn giá</th>
            <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--color-subtext)", borderBottom: "1px solid var(--color-border)", fontSize: "0.8rem", width: 130 }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
              <td style={{ padding: "10px 12px" }}>{item.productName}</td>
              <td style={{ padding: "10px 12px", color: "var(--color-subtext)", fontSize: "0.8rem" }}>{item.sku}</td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>{item.quantity}</td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>{formatCurrency(item.unitPrice)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--color-primary)" }}>{formatCurrency(item.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, fontWeight: 700, fontSize: "1rem", paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
        <span>Tổng tiền:</span>
        <span style={{ color: "var(--color-primary)" }}>{formatCurrency(receipt.totalAmount)}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8 }}>
        <Button variant="secondary" onClick={onClose}>Đóng</Button>
      </div>
    </div>
  );
}

// ---- Main page ----
export function WarehouseReceiptPage() {
  const { warehouseReceipts, updatePayment } = useWarehouseContext();
  const [detailReceipt, setDetailReceipt] = useState<WarehouseReceipt | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<WarehouseReceipt | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("transfer");
  const [payAmount, setPayAmount] = useState<string>("");

  const columns: TableColumn<WarehouseReceipt>[] = [
    { key: "code", label: "Mã phiếu", width: "150px" },
    { key: "supplierName", label: "Nhà cung cấp" },
    {
      key: "totalAmount",
      label: "Tổng tiền",
      width: "140px",
      align: "right",
      render: (val) => <strong style={{ color: "var(--color-primary)" }}>{formatCurrency(val as number)}</strong>,
    },
    {
      key: "paymentStatus",
      label: "Thanh toán",
      width: "150px",
      align: "center",
      render: (val) => {
        const v = val as string;
        const color = v === "paid" ? { bg: "#dcfce7", text: "#166534" } : v === "partial" ? { bg: "#fef9c3", text: "#854d0e" } : { bg: "#fee2e2", text: "#991b1b" };
        return <span style={{ background: color.bg, color: color.text, padding: "4px 10px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 }}>{RECEIPT_STATUS_LABEL[v]}</span>;
      },
    },
    {
      key: "paymentMethod",
      label: "Phương thức",
      width: "120px",
      align: "center",
      render: (val) => (
        <span style={{ fontSize: "0.75rem", color: "var(--color-subtext)", backgroundColor: "var(--color-bg)", padding: "3px 8px", borderRadius: "999px", whiteSpace: "nowrap" }}>
          {METHOD_LABEL[val as string] || String(val || "")}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Ngày tạo",
      width: "110px",
      render: (val) => formatDate(val as string),
    },
    {
      key: "id",
      label: "Hành động",
      width: "200px",
      align: "center",
      render: (_, row) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          <Button variant="ghost" size="sm" icon="fi fi-rr-eye" onClick={() => setDetailReceipt(row)}>Xem</Button>
          {!row.isDraft && row.paymentStatus !== "paid" && (
            <Button size="sm" icon="fi fi-rr-credit-card" onClick={() => {
              setSelectedPayment(row);
              setPayMethod(row.paymentMethod);
              setPayAmount(String(row.remainingAmount));
            }}>Thanh toán</Button>
          )}
        </div>
      ),
    },
  ];

  const currentSelectedPayment = selectedPayment
    ? (warehouseReceipts.find((r) => r.id === selectedPayment.id) ?? selectedPayment)
    : null;

  const handleConfirmPayment = () => {
    if (!currentSelectedPayment) return;
    const amount = Math.min(Number(payAmount) || 0, currentSelectedPayment.remainingAmount);
    updatePayment(currentSelectedPayment.id, amount, payMethod);
    setSelectedPayment(null);
  };

  return (
    <section>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Phiếu nhập kho</h2>
            <p className={styles.subtitle}>{warehouseReceipts.length} phiếu nhập</p>
          </div>
        </div>

        <Card>
          <CardHeader title="Danh sách phiếu nhập kho" />
          <CardBody className={styles.tableBody}>
            <Table columns={columns} data={warehouseReceipts} rowKey="id" emptyText="Chưa có phiếu nhập nào" />
          </CardBody>
        </Card>
      </div>

      <Modal isOpen={!!detailReceipt} onClose={() => setDetailReceipt(null)} title="Chi tiết phiếu nhập kho" size="lg">
        {detailReceipt && <ReceiptDetailView receipt={detailReceipt} onClose={() => setDetailReceipt(null)} />}
      </Modal>

      <Modal
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title="Xác nhận thanh toán"
        size="md"
      >
        {currentSelectedPayment && (
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <div>
                <span className={styles.receiptCode}>{currentSelectedPayment.code}</span>
                <p className={styles.supplierName}>{currentSelectedPayment.supplierName}</p>
              </div>
              <span className={[styles.badge, styles[currentSelectedPayment.paymentStatus]].join(" ")}>
                {RECEIPT_STATUS_LABEL[currentSelectedPayment.paymentStatus] || currentSelectedPayment.paymentStatus}
              </span>
            </div>

            <div className={styles.amounts}>
              <div className={styles.amountRow}>
                <span>Tổng tiền</span>
                <strong>{formatCurrency(currentSelectedPayment.totalAmount)}</strong>
              </div>
              <div className={styles.amountRow}>
                <span>Đã thanh toán</span>
                <strong className={styles.paidAmount}>
                  {formatCurrency(currentSelectedPayment.paidAmount)}
                </strong>
              </div>
              <div className={[styles.amountRow, styles.remainRow].join(" ")}>
                <span>Còn lại</span>
                <strong className={styles.remainAmount}>
                  {formatCurrency(currentSelectedPayment.remainingAmount)}
                </strong>
              </div>
            </div>

            {currentSelectedPayment.remainingAmount > 0 && (
              <div className={styles.paySection}>
                <p className={styles.payLabel}>Phương thức thanh toán</p>
                <div className={styles.methodGrid}>
                  {[
                    { value: "cash", label: "Tiền mặt", icon: "fi fi-rr-sack-dollar" },
                    { value: "transfer", label: "Chuyển khoản", icon: "fi fi-rr-bank" }
                  ].map((m) => (
                    <button
                      key={m.value}
                      className={[
                        styles.methodBtn,
                        payMethod === m.value ? styles.methodActive : "",
                      ].join(" ")}
                      onClick={() => setPayMethod(m.value as PaymentMethod)}
                      type="button"
                    >
                      <i className={m.icon} aria-hidden />
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>

                <Input
                  id="payAmount"
                  label="Số tiền thanh toán"
                  type="text"
                  inputMode="numeric"
                  suffix="VND"
                  value={
                    payAmount
                      ? new Intl.NumberFormat("vi-VN").format(Number(payAmount))
                      : ""
                  }
                  onChange={(e) => {
                    const v = e.target.value
                      .replace(/\./g, "")
                      .replace(/[^0-9]/g, "");
                    setPayAmount(v);
                  }}
                  placeholder="Nhập số tiền..."
                />
                <p className={styles.payHint}>
                  Tối đa: {formatCurrency(currentSelectedPayment.remainingAmount)}
                </p>
              </div>
            )}

            <div className={styles.detailFooter}>
              <Button variant="secondary" onClick={() => setSelectedPayment(null)}>Hủy</Button>
              {currentSelectedPayment.remainingAmount > 0 ? (
                <Button icon="fi fi-rr-check" onClick={handleConfirmPayment}>
                  Xác nhận thanh toán
                </Button>
              ) : (
                <Button variant="ghost" icon="fi fi-rr-check-circle" disabled>
                  Đã thanh toán đủ
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
