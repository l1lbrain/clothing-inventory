import { useState, useEffect, useCallback } from "react";
import type { PurchaseOrder } from "../../../types/purchaseOrder.types";
import { Input } from "../../../components/Input/Input";
import { Button } from "../../../components/Button/Button";
import { Card, CardHeader, CardBody } from "../../../components/Card/Card";
import { Modal } from "../../../components/Modal/Modal";
import { Table } from "../../../components/Table/Table";
import { Pagination } from "../../../components/Pagination/Pagination";
import { useToast } from "../../../components/Toast/ToastContext";
import { getReceivedPurchaseOrdersPage } from "../../../services/purchaseOrder";
import {
  getPaymentMethods,
  createPayment,
  getPaymentHistoryByPurchaseOrderId,
  type PaymentMethod,
  type PaymentRecord,
} from "../../../services/payment";
import { formatCurrency, formatDateTime } from "../../../utils/formatters";
import type { TableColumn } from "../../../types/common.types";
import styles from "./WarehouseReceipt.module.css";

// ─── Hằng số ──────────────────────────────────────────────────────────────────

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "Chưa thanh toán",
  PARTIALLY_PAID: "Thanh toán một phần",
  PAID: "Đã thanh toán",
};

const PAYMENT_STATUS_COLOR: Record<
  string,
  { bg: string; text: string }
> = {
  PAID: { bg: "#dcfce7", text: "#166534" },
  PARTIALLY_PAID: { bg: "#fef9c3", text: "#854d0e" },
  UNPAID: { bg: "#fee2e2", text: "#991b1b" },
};

/**
 * Format tên hiển thị của variant theo cấu trúc:
 * "[Tên SP] [option1] / [option2] / [option3]"
 */
function formatVariantName(
  productName: string,
  option1: string | null,
  option2: string | null,
  option3: string | null,
): string {
  const opts = [option1, option2, option3]
    .filter((o): o is string => Boolean(o && o.trim()))
    .join(" / ");
  return opts ? `${productName} ${opts}` : productName;
}

/** Trả về thời điểm hiện tại theo định dạng ISO 8601 không có múi giờ */
function nowLocalIsoString(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}`
  );
}

// ─── Payment Modal ─────────────────────────────────────────────────────────────

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

function PaymentModal({
  receipt,
  onClose,
  onSuccess,
}: {
  receipt: PurchaseOrder;
  onClose: () => void;
  onSuccess: (updatedReceipt: PurchaseOrder) => void;
}) {
  const { showToast } = useToast();

  // ── Dữ liệu phương thức thanh toán ───────────────────────────────────────
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);

  // ── Lịch sử thanh toán ────────────────────────────────────────────────────
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ── Tổng đã trả và còn lại (cập nhật sau mỗi lần thanh toán) ─────────────
  const [totalPaid, setTotalPaid] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState<PaymentFormState>({
    paymentMethodId: "",
    paymentDate: nowLocalIsoString(),
    amount: "",
    note: "",
  });
  const [errors, setErrors] = useState<PaymentFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Số tiền còn lại hiển thị (ưu tiên state real-time, fallback sang receipt)
  const effectiveRemaining =
    remaining !== null ? remaining : receipt.totalAmount;
  const effectiveTotalPaid =
    totalPaid !== null ? totalPaid : 0;

  // ── Fetch phương thức thanh toán ──────────────────────────────────────────
  useEffect(() => {
    const fetchMethods = async () => {
      try {
        setLoadingMethods(true);
        const methods = await getPaymentMethods();
        setPaymentMethods(methods.filter((m) => m.status === "ACTIVE"));
      } catch (err) {
        console.error("Failed to fetch payment methods:", err);
        showToast("Không thể tải danh sách phương thức thanh toán!", "error");
      } finally {
        setLoadingMethods(false);
      }
    };
    fetchMethods();
  }, [showToast]);

  // ── Fetch lịch sử thanh toán ──────────────────────────────────────────────
  const fetchHistory = useCallback(
    async (page: number) => {
      try {
        setLoadingHistory(true);
        const data = await getPaymentHistoryByPurchaseOrderId(
          Number(receipt.id),
          page,
        );
        setHistory(data.items);
        setHistoryTotal(data.totalElements);
        setHistoryPageSize(data.pageSize);

        // Cập nhật số tiền real-time từ lịch sử giao dịch gần nhất
        if (data.items.length > 0) {
          setTotalPaid(data.items[0].totalPaidAmount);
          setRemaining(data.items[0].remainingAmount);
        } else {
          setTotalPaid(0);
          setRemaining(receipt.totalAmount);
        }
      } catch (err) {
        console.error("Failed to fetch payment history:", err);
        showToast("Không thể tải lịch sử thanh toán!", "error");
      } finally {
        setLoadingHistory(false);
      }
    },
    [receipt.id, receipt.totalAmount, showToast],
  );

  useEffect(() => {
    fetchHistory(historyPage);
  }, [fetchHistory, historyPage]);

  // ── Validate form ─────────────────────────────────────────────────────────
  function validate(): boolean {
    const newErrors: PaymentFormErrors = {};

    if (!form.paymentMethodId) {
      newErrors.paymentMethodId = "Vui lòng chọn phương thức thanh toán.";
    }

    const amountNum = parseFloat(form.amount);
    if (!form.amount || isNaN(amountNum)) {
      newErrors.amount = "Vui lòng nhập số tiền thanh toán.";
    } else if (amountNum <= 0) {
      newErrors.amount = "Số tiền thanh toán phải lớn hơn 0.";
    } else if (amountNum > effectiveRemaining) {
      newErrors.amount = `Số tiền vượt quá số tiền còn nợ (${formatCurrency(effectiveRemaining)}).`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ── Submit thanh toán ─────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      const result = await createPayment({
        purchaseOrderId: Number(receipt.id),
        paymentMethodId: Number(form.paymentMethodId),
        paymentDate: form.paymentDate + ":00", // đủ giây cho LocalDateTime
        amount: parseFloat(form.amount),
        note: form.note.trim() || undefined,
      });

      showToast("Thanh toán thành công!", "success");

      // Cập nhật số tiền real-time
      setTotalPaid(result.totalPaidAmount);
      setRemaining(result.remainingAmount);

      // Reset form
      setForm((prev) => ({
        ...prev,
        amount: "",
        note: "",
        paymentDate: nowLocalIsoString(),
      }));
      setErrors({});

      // Refresh lịch sử giao dịch về trang 1
      setHistoryPage(1);
      await fetchHistory(1);

      // Thông báo lên component cha để refresh danh sách
      onSuccess({
        ...receipt,
        paymentStatus:
          result.remainingAmount === 0 ? "PAID" : "PARTIALLY_PAID",
      });
    } catch (err) {
      console.error("Failed to create payment:", err);
      const message =
        err instanceof Error ? err.message : "Thanh toán thất bại!";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  const isPaid = effectiveRemaining === 0;

  // ── Cột lịch sử giao dịch ────────────────────────────────────────────────
  const historyColumns: TableColumn<PaymentRecord>[] = [
    {
      key: "paymentDate",
      label: "Ngày TT",
      render: (val) => formatDateTime(val as string),
    },
    {
      key: "paymentMethodName",
      label: "Phương thức",
    },
    {
      key: "amount",
      label: "Số tiền",
      align: "right",
      render: (val) => (
        <strong style={{ color: "var(--color-success)" }}>
          {formatCurrency(val as number)}
        </strong>
      ),
    },
    {
      key: "remainingAmount",
      label: "Còn lại",
      align: "right",
      render: (val) => (
        <span style={{ color: "var(--color-danger)" }}>
          {formatCurrency(val as number)}
        </span>
      ),
    },
    {
      key: "createdByName",
      label: "Người thực hiện",
    },
    {
      key: "note",
      label: "Ghi chú",
      render: (val) => (val ? String(val) : "—"),
    },
  ];

  return (
    <div className={styles.detail}>
      {/* Header */}
      <div className={styles.detailHeader}>
        <div>
          <span className={styles.receiptCode}>{receipt.code}</span>
          <div className={styles.supplierName}>{receipt.supplierName}</div>
        </div>
        <span
          className={[
            styles.badge,
            isPaid
              ? styles.paid
              : effectiveTotalPaid > 0
                ? styles.partial
                : styles.unpaid,
          ].join(" ")}
        >
          {isPaid
            ? "Đã thanh toán"
            : effectiveTotalPaid > 0
              ? "Thanh toán một phần"
              : "Chưa thanh toán"}
        </span>
      </div>

      {/* Tóm tắt tài chính */}
      <div className={styles.amounts}>
        <div className={styles.amountRow}>
          <span>Tổng tiền đơn hàng</span>
          <strong>{formatCurrency(receipt.totalAmount)}</strong>
        </div>
        <div className={styles.amountRow}>
          <span>Đã thanh toán</span>
          <span className={styles.paidAmount}>
            {formatCurrency(effectiveTotalPaid)}
          </span>
        </div>
        <div className={[styles.amountRow, styles.remainRow].join(" ")}>
          <span>Còn phải trả</span>
          <span className={styles.remainAmount}>
            {formatCurrency(effectiveRemaining)}
          </span>
        </div>
      </div>

      {/* Form thanh toán (ẩn khi đã PAID) */}
      {!isPaid && (
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.paySection}>
            <div className={styles.payLabel}>Thực hiện thanh toán</div>

            {/* Phương thức thanh toán */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                htmlFor="pm-method"
                style={{
                  fontSize: "var(--font-sm)",
                  fontWeight: 500,
                  color: "var(--color-text)",
                }}
              >
                Phương thức thanh toán <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <div className={styles.methodGrid}>
                {loadingMethods ? (
                  <span style={{ fontSize: "var(--font-sm)", color: "var(--color-subtext)" }}>
                    Đang tải...
                  </span>
                ) : (
                  paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      id={`pm-method-${method.id}`}
                      className={[
                        styles.methodBtn,
                        form.paymentMethodId === String(method.id)
                          ? styles.methodActive
                          : "",
                      ].join(" ")}
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          paymentMethodId: String(method.id),
                        }));
                        setErrors((prev) => ({
                          ...prev,
                          paymentMethodId: undefined,
                        }));
                      }}
                    >
                      <i
                        className={
                          method.code === "CASH"
                            ? "fi fi-rr-money-bill-wave"
                            : method.code === "BANK_TRANSFER"
                              ? "fi fi-rr-bank"
                              : "fi fi-rr-credit-card"
                        }
                      />
                      {method.name}
                    </button>
                  ))
                )}
              </div>
              {errors.paymentMethodId && (
                <span
                  style={{
                    fontSize: "var(--font-xs)",
                    color: "var(--color-danger)",
                  }}
                >
                  {errors.paymentMethodId}
                </span>
              )}
            </div>

            {/* Số tiền và ngày thanh toán */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <Input
                id="pm-amount"
                label="Số tiền thanh toán"
                type="number"
                step="any"
                placeholder={`Tối đa ${formatCurrency(effectiveRemaining)}`}
                value={form.amount}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, amount: e.target.value }));
                  setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                onWheel={(e) => e.currentTarget.blur()}
                error={errors.amount}
                required
              />
              <Input
                id="pm-date"
                label="Ngày thanh toán"
                type="datetime-local"
                value={form.paymentDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, paymentDate: e.target.value }))
                }
                required
              />
            </div>

            {/* Ghi chú */}
            <Input
              id="pm-note"
              label="Ghi chú"
              type="text"
              placeholder="Ghi chú cho giao dịch này (tuỳ chọn)"
              value={form.note}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, note: e.target.value }))
              }
            />

            {/* Nút xác nhận */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                type="submit"
                variant="primary"
                icon="fi fi-rr-check"
                loading={submitting}
                disabled={submitting}
              >
                Xác nhận thanh toán
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Lịch sử giao dịch */}
      <div>
        <div
          style={{
            fontWeight: 600,
            fontSize: "var(--font-base)",
            marginBottom: "var(--space-3)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <i className="fi fi-rr-list" />
          Lịch sử giao dịch
          {historyTotal > 0 && (
            <span
              style={{
                background: "var(--color-primary-light)",
                color: "var(--color-primary)",
                borderRadius: "var(--radius-full)",
                padding: "1px 8px",
                fontSize: "var(--font-xs)",
                fontWeight: 600,
              }}
            >
              {historyTotal}
            </span>
          )}
        </div>

        <Table<PaymentRecord>
          columns={historyColumns}
          data={history}
          rowKey="id"
          loading={loadingHistory}
          emptyText="Chưa có giao dịch nào"
        />

        {historyTotal > historyPageSize && (
          <div style={{ marginTop: "var(--space-3)" }}>
            <Pagination
              pagination={{
                page: historyPage,
                pageSize: historyPageSize,
                total: historyTotal,
              }}
              onPageChange={setHistoryPage}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={styles.detailFooter}>
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </div>
  );
}

// ─── Receipt Detail Modal (read-only + nút Thanh toán) ────────────────────────

function ReceiptDetailView({
  receipt,
  onClose,
  onPay,
}: {
  receipt: PurchaseOrder;
  onClose: () => void;
  onPay: () => void;
}) {
  const payStatus = PAYMENT_STATUS_LABEL[receipt.paymentStatus] ?? receipt.paymentStatus;
  const payColor = PAYMENT_STATUS_COLOR[receipt.paymentStatus] ?? { bg: "#fee2e2", text: "#991b1b" };
  const isPaid = receipt.paymentStatus === "PAID";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem" }}>{receipt.code}</div>
          <div style={{ color: "var(--color-subtext)", fontSize: "0.875rem", marginTop: 4 }}>
            {receipt.supplierName}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <span
            style={{
              background: payColor.bg,
              color: payColor.text,
              padding: "3px 10px",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            {payStatus}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, fontSize: "0.8rem", color: "var(--color-subtext)" }}>
        <span>
          <i className="fi fi-rr-calendar" style={{ marginRight: 4 }} />
          Ngày đặt: {formatDateTime(receipt.orderDate)}
        </span>
        {receipt.receivedDate && (
          <span>
            <i className="fi fi-rr-box-check" style={{ marginRight: 4 }} />
            Ngày nhập: {formatDateTime(receipt.receivedDate)}
          </span>
        )}
        {receipt.note && (
          <span>
            <i className="fi fi-rr-note" style={{ marginRight: 4 }} />
            Ghi chú: {receipt.note}
          </span>
        )}
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.85rem",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}
      >
        <thead>
          <tr style={{ background: "var(--color-bg)" }}>
            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "var(--color-subtext)", borderBottom: "1px solid var(--color-border)", fontSize: "0.8rem" }}>
              Sản phẩm
            </th>
            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "var(--color-subtext)", borderBottom: "1px solid var(--color-border)", fontSize: "0.8rem" }}>
              SKU
            </th>
            <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--color-subtext)", borderBottom: "1px solid var(--color-border)", fontSize: "0.8rem", width: 80 }}>
              SL
            </th>
            <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--color-subtext)", borderBottom: "1px solid var(--color-border)", fontSize: "0.8rem", width: 130 }}>
              Đơn giá
            </th>
            <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--color-subtext)", borderBottom: "1px solid var(--color-border)", fontSize: "0.8rem", width: 130 }}>
              Thành tiền
            </th>
          </tr>
        </thead>
        <tbody>
          {receipt.details.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
              <td style={{ padding: "10px 12px" }}>
                {formatVariantName(item.productName, item.option1Value, item.option2Value, item.option3Value)}
              </td>
              <td style={{ padding: "10px 12px", color: "var(--color-subtext)", fontSize: "0.8rem" }}>
                {item.sku}
              </td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>{item.quantity}</td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>
                {formatCurrency(item.unitPrice)}
              </td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--color-primary)" }}>
                {formatCurrency(item.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          fontWeight: 700,
          fontSize: "1rem",
          paddingTop: 12,
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <span>Tổng tiền:</span>
        <span style={{ color: "var(--color-primary)" }}>{formatCurrency(receipt.totalAmount)}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8 }}>
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
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

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function WarehouseReceiptPage() {
  const { showToast } = useToast();

  // ── Dữ liệu + phân trang ─────────────────────────────────────────────────
  const [receipts, setReceipts] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // ── Tìm kiếm ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // ── Modal state ───────────────────────────────────────────────────────────
  const [detailReceipt, setDetailReceipt] = useState<PurchaseOrder | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<PurchaseOrder | null>(null);

  // ── Debounce tìm kiếm ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset về trang 1 khi query thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery]);

  // ── Fetch danh sách phiếu nhập kho ───────────────────────────────────────
  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getReceivedPurchaseOrdersPage(
        currentPage,
        debouncedQuery || undefined,
      );
      setReceipts(data.items);
      setTotalElements(data.totalElements);
      setPageSize(data.pageSize);
    } catch (err) {
      console.error("Failed to fetch warehouse receipts:", err);
      showToast("Không thể tải danh sách phiếu nhập kho!", "error");
      setReceipts([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedQuery, showToast]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // ── Callback khi thanh toán thành công ────────────────────────────────────
  const handlePaymentSuccess = useCallback(
    (updatedReceipt: PurchaseOrder) => {
      // Cập nhật paymentStatus trong danh sách ngay lập tức
      setReceipts((prev) =>
        prev.map((r) =>
          r.id === updatedReceipt.id
            ? { ...r, paymentStatus: updatedReceipt.paymentStatus }
            : r,
        ),
      );
      // Đồng bộ detailReceipt nếu đang mở
      setDetailReceipt((prev) =>
        prev?.id === updatedReceipt.id
          ? { ...prev, paymentStatus: updatedReceipt.paymentStatus }
          : prev,
      );
    },
    [],
  );

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns: TableColumn<PurchaseOrder>[] = [
    { key: "code", label: "Mã phiếu", width: "150px" },
    { key: "supplierName", label: "Nhà cung cấp" },
    {
      key: "details",
      label: "SL Nhập",
      width: "90px",
      align: "center",
      render: (val) => {
        const details = val as PurchaseOrder["details"];
        const total = details.reduce((s, d) => s + d.quantity, 0);
        return <span style={{ fontWeight: 600 }}>{total}</span>;
      },
    },
    {
      key: "totalAmount",
      label: "Tổng tiền",
      width: "140px",
      align: "right",
      render: (val) => (
        <strong style={{ color: "var(--color-primary)" }}>
          {formatCurrency(val as number)}
        </strong>
      ),
    },
    {
      key: "paymentStatus",
      label: "Thanh toán",
      width: "160px",
      align: "center",
      render: (val) => {
        const v = val as string;
        const color = PAYMENT_STATUS_COLOR[v] ?? { bg: "#fee2e2", text: "#991b1b" };
        return (
          <span
            style={{
              background: color.bg,
              color: color.text,
              padding: "4px 10px",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            {PAYMENT_STATUS_LABEL[v] ?? v}
          </span>
        );
      },
    },
    {
      key: "receivedDate",
      label: "Ngày nhập",
      width: "130px",
      render: (val) => (val ? formatDateTime(val as string) : "—"),
    },
    {
      key: "id",
      label: "Hành động",
      width: "100px",
      align: "center",
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          icon="fi fi-rr-eye"
          onClick={() => setDetailReceipt(row)}
        >
          Xem
        </Button>
      ),
    },
  ];

  return (
    <section>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Phiếu nhập kho</h2>
            <p className={styles.subtitle}>{totalElements} phiếu nhập</p>
          </div>
        </div>

        {/* Search */}
        <div style={{ maxWidth: 340 }}>
          <Input
            id="wr-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã phiếu, nhà cung cấp..."
          />
        </div>

        <Card>
          <CardHeader title="Danh sách phiếu nhập kho" />
          <CardBody className={styles.tableBody}>
            <Table
              columns={columns}
              data={receipts}
              rowKey="id"
              loading={loading}
              emptyText="Chưa có phiếu nhập nào"
            />
          </CardBody>
        </Card>

        {totalElements > 0 && (
          <Pagination
            pagination={{ page: currentPage, pageSize, total: totalElements }}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Modal Chi tiết phiếu nhập kho */}
      <Modal
        isOpen={!!detailReceipt}
        onClose={() => setDetailReceipt(null)}
        title="Chi tiết phiếu nhập kho"
        size="lg"
      >
        {detailReceipt && (
          <ReceiptDetailView
            receipt={detailReceipt}
            onClose={() => setDetailReceipt(null)}
            onPay={() => {
              setPaymentReceipt(detailReceipt);
              setDetailReceipt(null);
            }}
          />
        )}
      </Modal>

      {/* Modal Thanh toán */}
      <Modal
        isOpen={!!paymentReceipt}
        onClose={() => setPaymentReceipt(null)}
        title="Thanh toán phiếu nhập kho"
        size="xl"
      >
        {paymentReceipt && (
          <PaymentModal
            receipt={paymentReceipt}
            onClose={() => setPaymentReceipt(null)}
            onSuccess={(updated) => {
              handlePaymentSuccess(updated);
              setPaymentReceipt(updated);
            }}
          />
        )}
      </Modal>
    </section>
  );
}
