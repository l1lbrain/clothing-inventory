import { useState, useEffect, useCallback } from "react";
import type { PurchaseOrder } from "../../../types/purchaseOrder.types";
import type { TableColumn } from "../../../types/common.types";
import { Input } from "../../../components/Input/Input";
import { Button } from "../../../components/Button/Button";
import { Table } from "../../../components/Table/Table";
import { Pagination } from "../../../components/Pagination/Pagination";
import { useToast } from "../../../components/Toast/ToastContext";
import {
  getPaymentMethods,
  createPayment,
  getPaymentHistoryByPurchaseOrderId,
  type PaymentMethod,
  type PaymentRecord,
} from "../../../services/payment";
import { formatCurrency, formatDateTime, formatNumber } from "../../../utils/formatters";
import { nowLocalIsoString } from "../../../utils/datePreset";
import styles from "./PaymentModal.module.css";

interface PaymentFormState {
  paymentMethodId: string;
  paymentDate: string;
  amount: string;
  note: string;
}
interface PaymentFormErrors {
  paymentMethodId?: string;
  amount?: string;
}

interface Props {
  receipt: PurchaseOrder;
  onClose: () => void;
  onSuccess: (updatedReceipt: PurchaseOrder) => void;
  onUserClick?: (userId: string, userName: string) => void;
}

export function PaymentModal({ receipt, onClose, onSuccess, onUserClick }: Props) {
  const { showToast } = useToast();

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [totalPaid, setTotalPaid] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const [form, setForm] = useState<PaymentFormState>({
    paymentMethodId: "", paymentDate: nowLocalIsoString(), amount: "", note: "",
  });
  const [amountDisplay, setAmountDisplay] = useState("");
  const [errors, setErrors] = useState<PaymentFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const effectiveRemaining = remaining !== null ? remaining : receipt.totalAmount;
  const effectiveTotalPaid = totalPaid !== null ? totalPaid : 0;

  useEffect(() => {
    getPaymentMethods()
      .then((methods) => setPaymentMethods(methods.filter((m) => m.status === "ACTIVE")))
      .catch(() => showToast("Không thể tải danh sách phương thức thanh toán!", "error"))
      .finally(() => setLoadingMethods(false));
  }, [showToast]);

  const fetchHistory = useCallback(async (page: number) => {
    try {
      const data = await getPaymentHistoryByPurchaseOrderId(Number(receipt.id), page);
      setHistory(data.items);
      setHistoryTotal(data.totalElements);
      setHistoryPageSize(data.pageSize);
      if (data.items.length > 0) {
        setTotalPaid(data.items[0].totalPaidAmount);
        setRemaining(data.items[0].remainingAmount);
      } else {
        setTotalPaid(0);
        setRemaining(receipt.totalAmount);
      }
    } catch {
      showToast("Không thể tải lịch sử thanh toán!", "error");
    } finally {
      setLoadingHistory(false);
    }
  }, [receipt.id, receipt.totalAmount, showToast]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchHistory(historyPage);
    });
  }, [fetchHistory, historyPage]);

  function validate(): boolean {
    const errs: PaymentFormErrors = {};
    if (!form.paymentMethodId) errs.paymentMethodId = "Vui lòng chọn phương thức thanh toán.";
    const amountNum = parseFloat(form.amount);
    if (!form.amount || isNaN(amountNum)) errs.amount = "Vui lòng nhập số tiền thanh toán.";
    else if (amountNum <= 0) errs.amount = "Số tiền thanh toán phải lớn hơn 0.";
    else if (amountNum > effectiveRemaining)
      errs.amount = `Số tiền vượt quá số tiền còn nợ (${formatCurrency(effectiveRemaining)}).`;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      const result = await createPayment({
        purchaseOrderId: Number(receipt.id),
        paymentMethodId: Number(form.paymentMethodId),
        paymentDate: form.paymentDate + ":00",
        amount: parseFloat(form.amount),
        note: form.note.trim() || undefined,
      });
      showToast("Thanh toán thành công!", "success");
      setTotalPaid(result.totalPaidAmount);
      setRemaining(result.remainingAmount);
      setForm((prev) => ({ ...prev, amount: "", note: "", paymentDate: nowLocalIsoString() }));
      setAmountDisplay("");
      setErrors({});
      setHistoryPage(1);
      setLoadingHistory(true);
      await fetchHistory(1);
      onSuccess({ ...receipt, paymentStatus: result.remainingAmount === 0 ? "PAID" : "PARTIALLY_PAID" });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Thanh toán thất bại!", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const isPaid = effectiveRemaining === 0;

  const getMethodIcon = (code: string) => {
    if (code === "CASH") return "fi fi-rr-money-bill-wave";
    if (code === "BANK_TRANSFER") return "fi fi-rr-bank";
    return "fi fi-rr-credit-card";
  };

  const historyColumns: TableColumn<PaymentRecord>[] = [
    { key: "paymentDate", label: "Ngày TT", render: (val) => formatDateTime(val as string) },
    { key: "paymentMethodName", label: "Phương thức" },
    {
      key: "amount", label: "Số tiền", align: "right",
      render: (val) => <strong style={{ color: "var(--color-success)" }}>{formatCurrency(val as number)}</strong>,
    },
    {
      key: "remainingAmount", label: "Còn lại", align: "right",
      render: (val) => <span style={{ color: "var(--color-danger)" }}>{formatCurrency(val as number)}</span>,
    },
    {
      key: "createdByName", label: "Người thực hiện",
      render: (val, row) =>
        onUserClick ? (
          <button className={styles.clickableLink}
            onClick={() => onUserClick(String((row as PaymentRecord).createdById), String(val))}>
            {String(val)}
          </button>
        ) : String(val),
    },
    { key: "note", label: "Ghi chú", render: (val) => (val ? String(val) : "—") },
  ];

  return (
    <div className={styles.detail}>
      {/* Header */}
      <div className={styles.detailHeader}>
        <div>
          <span className={styles.receiptCode}>{receipt.code}</span>
          <div className={styles.supplierName}>{receipt.supplierName}</div>
        </div>
        <span className={[styles.badge, isPaid ? styles.paid : effectiveTotalPaid > 0 ? styles.partial : styles.unpaid].join(" ")}>
          {isPaid ? "Đã thanh toán" : effectiveTotalPaid > 0 ? "Thanh toán một phần" : "Chưa thanh toán"}
        </span>
      </div>

      {/* Amount summary */}
      <div className={styles.amounts}>
        <div className={styles.amountRow}>
          <span>Tổng tiền đơn hàng</span>
          <strong>{formatCurrency(receipt.totalAmount)}</strong>
        </div>
        <div className={styles.amountRow}>
          <span>Đã thanh toán</span>
          <span className={styles.paidAmount}>{formatCurrency(effectiveTotalPaid)}</span>
        </div>
        <div className={[styles.amountRow, styles.remainRow].join(" ")}>
          <span>Còn phải trả</span>
          <span className={styles.remainAmount}>{formatCurrency(effectiveRemaining)}</span>
        </div>
      </div>

      {/* Payment form */}
      {!isPaid && (
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.paySection}>
            <div className={styles.payLabel}>Thực hiện thanh toán</div>

            <div className={styles.methodSection}>
              <label className={styles.fieldLabel}>
                Phương thức thanh toán <span className={styles.required}>*</span>
              </label>
              <div className={styles.methodGrid}>
                {loadingMethods ? (
                  <span className={styles.loading}>Đang tải...</span>
                ) : (
                  paymentMethods.map((method) => (
                    <button
                      key={method.id} type="button"
                      id={`pm-method-${method.id}`}
                      className={[styles.methodBtn, form.paymentMethodId === String(method.id) ? styles.methodActive : ""].join(" ")}
                      onClick={() => {
                        setForm((prev) => ({ ...prev, paymentMethodId: String(method.id) }));
                        setErrors((prev) => ({ ...prev, paymentMethodId: undefined }));
                      }}
                    >
                      <i className={getMethodIcon(method.code)} />
                      {method.name}
                    </button>
                  ))
                )}
              </div>
              {errors.paymentMethodId && <span className={styles.errorText}>{errors.paymentMethodId}</span>}
            </div>

            <div className={styles.amountGrid}>
              <Input
                id="pm-amount" label="Số tiền thanh toán" type="text" inputMode="numeric" required
                placeholder={`Tối đa ${formatCurrency(effectiveRemaining)}`}
                value={amountDisplay}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setForm((prev) => ({ ...prev, amount: raw }));
                  setAmountDisplay(raw ? formatNumber(Number(raw)) : "");
                  setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                error={errors.amount}
              />
              <Input
                id="pm-date" label="Ngày thanh toán" type="datetime-local" required
                value={form.paymentDate}
                onChange={(e) => setForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
              />
            </div>

            <Input
              id="pm-note" label="Ghi chú" type="text"
              placeholder="Ghi chú cho giao dịch này (tuỳ chọn)"
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            />

            <div className={styles.submitRow}>
              <Button type="submit" variant="primary" icon="fi fi-rr-check" loading={submitting} disabled={submitting}>
                Xác nhận thanh toán
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* History */}
      <div>
        <div className={styles.historyTitle}>
          <i className="fi fi-rr-list" />
          Lịch sử giao dịch
          {historyTotal > 0 && <span className={styles.historyBadge}>{historyTotal}</span>}
        </div>
        <Table<PaymentRecord> columns={historyColumns} data={history} rowKey="id" loading={loadingHistory} emptyText="Chưa có giao dịch nào" />
        {historyTotal > historyPageSize && (
          <div style={{ marginTop: "var(--space-3)" }}>
            <Pagination
              pagination={{ page: historyPage, pageSize: historyPageSize, total: historyTotal }}
              onPageChange={(page) => {
                setLoadingHistory(true);
                setHistoryPage(page);
              }}
            />
          </div>
        )}
      </div>

      <div className={styles.detailFooter}>
        <Button variant="secondary" onClick={onClose}>Đóng</Button>
      </div>
    </div>
  );
}
