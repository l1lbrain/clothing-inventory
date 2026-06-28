import { useState, useMemo } from "react";
import type { WarehouseReceipt } from "../../../types/payment.types";
import type { PaymentMethod } from "../../../types/common.types";
import { Table } from "../../../components/Table/Table";
import { Modal } from "../../../components/Modal/Modal";
import { Button } from "../../../components/Button/Button";
import { Card, CardHeader, CardBody } from "../../../components/Card/Card";
import { Input } from "../../../components/Input/Input";
import type { TableColumn } from "../../../types/common.types";
import { formatCurrency, formatDate } from "../../../utils/formatters";
import { useWarehouseContext } from "../../../hooks/useWarehouseContext";
import styles from "./Payment.module.css";

const STATUS_LABEL: Record<string, string> = {
  paid: "Đã thanh toán",
  partial: "Một phần",
  unpaid: "Chưa thanh toán",
};

const METHOD_LABEL: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  debt: "Công nợ",
};

const METHOD_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: "cash", label: "Tiền mặt", icon: "fi fi-rr-sack-dollar" },
  { value: "transfer", label: "Chuyển khoản", icon: "fi fi-rr-bank" },
];

export function Payment() {
  const { warehouseReceipts, updatePayment } = useWarehouseContext();
  const [selected, setSelected] = useState<WarehouseReceipt | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("transfer");
  const [payAmount, setPayAmount] = useState<string>("");

  // Chỉ hiển thị phiếu đã xác nhận (isDraft === false)
  const confirmedReceipts = useMemo(
    () => warehouseReceipts.filter((r) => !r.isDraft),
    [warehouseReceipts],
  );

  const openDetail = (row: WarehouseReceipt) => {
    setSelected(row);
    setPayMethod(row.paymentMethod);
    setPayAmount(String(row.remainingAmount));
  };

  const currentSelected = selected
    ? (warehouseReceipts.find((r) => r.id === selected.id) ?? selected)
    : null;

  const handleConfirmPayment = () => {
    if (!currentSelected) return;
    const amount = Math.min(Number(payAmount) || 0, currentSelected.remainingAmount);
    updatePayment(currentSelected.id, amount, payMethod);
    setSelected(null);
  };

  const columns: TableColumn<WarehouseReceipt>[] = [
    { key: "code", label: "Mã phiếu", width: "150px" },
    { key: "supplierName", label: "Nhà cung cấp" },
    {
      key: "totalAmount",
      label: "Tổng giá trị",
      width: "140px",
      align: "right",
      render: (val) => (
        <strong className={styles.amountText}>{formatCurrency(val as number)}</strong>
      ),
    },
    {
      key: "paidAmount",
      label: "Đã thanh toán",
      width: "140px",
      align: "right",
      render: (val) => (
        <span className={styles.paidText}>{formatCurrency(val as number)}</span>
      ),
    },
    {
      key: "remainingAmount",
      label: "Còn lại",
      width: "130px",
      align: "right",
      render: (val) => (
        <span className={(val as number) > 0 ? styles.remainText : styles.zerText}>
          {formatCurrency(val as number)}
        </span>
      ),
    },
    {
      key: "paymentStatus",
      label: "Trạng thái",
      width: "140px",
      align: "center",
      render: (val) => (
        <span className={[styles.badge, styles[val as string]].join(" ")}>
          {STATUS_LABEL[val as string]}
        </span>
      ),
    },
    {
      key: "paymentMethod",
      label: "Phương thức",
      width: "120px",
      align: "center",
      render: (val) => (
        <span className={styles.method}>{METHOD_LABEL[val as string]}</span>
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
      label: "",
      width: "100px",
      align: "center",
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          icon="fi fi-rr-credit-card"
          onClick={() => openDetail(row)}
        >
          Thanh toán
        </Button>
      ),
    },
  ];

  return (
    <section>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Thanh toán nhà cung cấp</h2>
            <p className={styles.subtitle}>{confirmedReceipts.length} phiếu nhập</p>
          </div>
        </div>

        <Card>
          <CardHeader title="Danh sách phiếu nhập" />
          <CardBody className={styles.tableBody}>
            <Table columns={columns} data={confirmedReceipts} rowKey="id" emptyText="Chưa có phiếu nhập nào được xác nhận" />
          </CardBody>
        </Card>
      </div>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Xác nhận thanh toán"
        size="md"
      >
        {currentSelected && (
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <div>
                <span className={styles.receiptCode}>{currentSelected.code}</span>
                <p className={styles.supplierName}>{currentSelected.supplierName}</p>
              </div>
              <span className={[styles.badge, styles[currentSelected.paymentStatus]].join(" ")}>
                {STATUS_LABEL[currentSelected.paymentStatus]}
              </span>
            </div>

            <div className={styles.amounts}>
              <div className={styles.amountRow}>
                <span>Tổng tiền</span>
                <strong>{formatCurrency(currentSelected.totalAmount)}</strong>
              </div>
              <div className={styles.amountRow}>
                <span>Đã thanh toán</span>
                <strong className={styles.paidAmount}>
                  {formatCurrency(currentSelected.paidAmount)}
                </strong>
              </div>
              <div className={[styles.amountRow, styles.remainRow].join(" ")}>
                <span>Còn lại</span>
                <strong className={styles.remainAmount}>
                  {formatCurrency(currentSelected.remainingAmount)}
                </strong>
              </div>
            </div>

            {currentSelected.remainingAmount > 0 && (
              <div className={styles.paySection}>
                <p className={styles.payLabel}>Phương thức thanh toán</p>
                <div className={styles.methodGrid}>
                  {METHOD_OPTIONS.map((m) => (
                    <button
                      key={m.value}
                      className={[
                        styles.methodBtn,
                        payMethod === m.value ? styles.methodActive : "",
                      ].join(" ")}
                      onClick={() => setPayMethod(m.value)}
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
                  Tối đa: {formatCurrency(currentSelected.remainingAmount)}
                </p>
              </div>
            )}

            <div className={styles.detailFooter}>
              <Button variant="secondary" onClick={() => setSelected(null)}>Hủy</Button>
              {currentSelected.remainingAmount > 0 ? (
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
