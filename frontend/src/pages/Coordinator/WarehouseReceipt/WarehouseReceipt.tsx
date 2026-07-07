import { useState, useEffect, useCallback, useMemo } from "react";
import type { PurchaseOrder } from "../../../types/purchaseOrder.types";
import { Input } from "../../../components/Input/Input";
import { SearchBox } from "../../../components/SearchBox/SearchBox";
import { Button } from "../../../components/Button/Button";
import { Card, CardHeader, CardBody } from "../../../components/Card/Card";
import { Modal } from "../../../components/Modal/Modal";
import { Table } from "../../../components/Table/Table";
import { Select } from "../../../components/Select/Select";
import { Pagination } from "../../../components/Pagination/Pagination";
import { useToast } from "../../../components/Toast/ToastContext";
import { SupplierDetailModal } from "../../../components/SupplierDetailModal/SupplierDetailModal";
import { VariantDetailModal } from "../../../components/VariantDetailModal/VariantDetailModal";
import { UserDetailModal } from "../../../components/UserDetailModal/UserDetailModal";
import { getReceivedPurchaseOrdersPage } from "../../../services/purchaseOrder";
import {
  getPaymentMethods,
  createPayment,
  getPaymentHistoryByPurchaseOrderId,
  type PaymentMethod,
  type PaymentRecord,
} from "../../../services/payment";
import { formatCurrency, formatDateTime, formatNumber } from "../../../utils/formatters";
import type { TableColumn } from "../../../types/common.types";
import {
  SupplierSearchDropdown,
  type SupplierOption,
} from "../../../components/SupplierSearchDropdown/SupplierSearchDropdown";
import styles from "./WarehouseReceipt.module.css";


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

// Định dạng tên biến thể hiển thị
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

// Định dạng thời gian hiện tại ISO 8601 không có múi giờ
function nowLocalIsoString(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}`
  );
}

// --- Bộ lọc thời gian ---
type DatePreset = "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "custom";

const DATE_PRESET_OPTIONS: { value: DatePreset | ""; label: string }[] = [
  { value: "", label: "Tất cả thời gian" },
  { value: "thisWeek", label: "Tuần này" },
  { value: "lastWeek", label: "Tuần trước" },
  { value: "thisMonth", label: "Tháng này" },
  { value: "lastMonth", label: "Tháng trước" },
  { value: "custom", label: "Tự chọn..." },
];

/** Định dạng Date thành "YYYY-MM-DD" (local, không có UTC offset). */
function toDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Tính khoảng ngày cho preset định sẵn.
 * Tuần tính từ Thứ Hai (ISO 8601).
 */
function getDateRangeForPreset(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=CN, 1=T2, ..., 6=T7
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  if (preset === "thisWeek") {
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: toDateString(monday), to: toDateString(sunday) };
  }
  if (preset === "lastWeek") {
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() + mondayOffset - 7);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    return { from: toDateString(lastMonday), to: toDateString(lastSunday) };
  }
  if (preset === "thisMonth") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toDateString(first), to: toDateString(last) };
  }
  if (preset === "lastMonth") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toDateString(first), to: toDateString(last) };
  }
  return { from: "", to: "" };
}

/** Chuyển "YYYY-MM-DD" sang ISO LocalDateTime với giờ 00:00:00 hoặc 23:59:59. */
function toIsoLocal(dateStr: string, endOfDay: boolean): string {
  return `${dateStr}T${endOfDay ? "23:59:59" : "00:00:00"}`;
}


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
  onUserClick,
}: {
  receipt: PurchaseOrder;
  onClose: () => void;
  onSuccess: (updatedReceipt: PurchaseOrder) => void;
  onUserClick?: (userId: string, userName: string) => void;
}) {
  const { showToast } = useToast();

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);

  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [totalPaid, setTotalPaid] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const [form, setForm] = useState<PaymentFormState>({
    paymentMethodId: "",
    paymentDate: nowLocalIsoString(),
    amount: "",
    note: "",
  });
  // Chuỗi hiển thị đã được format theo định dạng tiền VN (1.000.000)
  const [amountDisplay, setAmountDisplay] = useState("");
  const [errors, setErrors] = useState<PaymentFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Số tiền còn lại hiển thị (ưu tiên state real-time, fallback sang receipt)
  const effectiveRemaining =
    remaining !== null ? remaining : receipt.totalAmount;
  const effectiveTotalPaid =
    totalPaid !== null ? totalPaid : 0;

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
    let active = true;
    const load = async () => {
      await Promise.resolve();
      if (active) {
        fetchHistory(historyPage);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [fetchHistory, historyPage]);

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
      setAmountDisplay("");
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
      render: (val, row) =>
        onUserClick ? (
          <button
            className={styles.clickableLink}
            onClick={() => onUserClick(String((row as PaymentRecord).createdById), String(val))}
            title="Xem thông tin người thực hiện"
          >
            {String(val)}
          </button>
        ) : (
          String(val)
        ),
    },
    {
      key: "note",
      label: "Ghi chú",
      render: (val) => (val ? String(val) : "—"),
    },
  ];

  return (
    <div className={styles.detail}>
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

      {!isPaid && (
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.paySection}>
            <div className={styles.payLabel}>Thực hiện thanh toán</div>

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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <Input
                id="pm-amount"
                label="Số tiền thanh toán"
                type="text"
                inputMode="numeric"
                placeholder={`Tối đa ${formatCurrency(effectiveRemaining)}`}
                value={amountDisplay}
                onChange={(e) => {
                  // Loại bỏ tất cả ký tự không phải chữ số
                  const raw = e.target.value.replace(/\D/g, "");
                  // Cập nhật giá trị thuần (dùng để validate / submit)
                  setForm((prev) => ({ ...prev, amount: raw }));
                  // Cập nhật chuỗi hiển thị đã format (VD: 1.000.000, 500.000, ...)
                  setAmountDisplay(raw ? formatNumber(Number(raw)) : "");
                  setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
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

      <div className={styles.detailFooter}>
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </div>
  );
}


function ReceiptDetailView({
  receipt,
  onClose,
  onPay,
  onSupplierClick,
  onVariantClick,
}: {
  receipt: PurchaseOrder;
  onClose: () => void;
  onPay: () => void;
  onSupplierClick?: (supplierId: string) => void;
  onVariantClick?: (variantId: string) => void;
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
            {onSupplierClick ? (
              <button
                className={styles.clickableLink}
                onClick={() => onSupplierClick(receipt.supplierId)}
                title="Xem chi tiết nhà cung cấp"
              >
                {receipt.supplierName}
              </button>
            ) : (
              receipt.supplierName
            )}
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

      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "var(--color-subtext)" }}>
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
                {onVariantClick ? (
                  <button
                    className={styles.clickableLink}
                    onClick={() => onVariantClick(item.variantId)}
                    title="Xem chi tiết phiên bản sản phẩm"
                  >
                    {item.sku}
                  </button>
                ) : (
                  item.sku
                )}
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


export function WarehouseReceiptPage() {
  const { showToast } = useToast();

  const [receipts, setReceipts] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [sortBy, setSortBy] = useState<"receivedDate" | "totalAmount" | "totalQuantity">("receivedDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<SupplierOption | null>(null);

  // Bộ lọc thời gian
  const [datePreset, setDatePreset] = useState<DatePreset | "">("");
  const [customFrom, setCustomFrom] = useState(""); // "YYYY-MM-DD"
  const [customTo, setCustomTo] = useState(""); // "YYYY-MM-DD"
  const [dateFrom, setDateFrom] = useState(""); // ISO LocalDateTime gửi lên BE
  const [dateTo, setDateTo] = useState(""); // ISO LocalDateTime gửi lên BE

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [detailReceipt, setDetailReceipt] = useState<PurchaseOrder | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<PurchaseOrder | null>(null);

  // State cho quick-view modals
  const [quickViewSupplierId, setQuickViewSupplierId] = useState<string | null>(null);
  const [quickViewVariantId, setQuickViewVariantId] = useState<string | null>(null);
  const [quickViewUserId, setQuickViewUserId] = useState<string | null>(null);
  const [quickViewUserName, setQuickViewUserName] = useState<string>("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  /** Xử lý khi người dùng bấm vào header cột có thể sort */
  const handleSort = (field: "receivedDate" | "totalAmount" | "totalQuantity") => {
    console.log("[WarehouseReceipt Sort] Clicked:", field, "Current state:", { sortBy, sortDir });
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  /** Render label header có thể sort kèm icon chỉ hướng */
  const buildSortHeader = (
    label: string,
    field: "receivedDate" | "totalAmount" | "totalQuantity",
  ) => {
    const isActive = sortBy === field;
    const isAsc = isActive && sortDir === "asc";
    const iconClass = isAsc ? "fi fi-rr-caret-up" : "fi fi-rr-caret-down";

    return (
      <span
        className={styles.sortableHeader}
        onClick={() => handleSort(field)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleSort(field)}
      >
        {label}
        <i
          className={`${iconClass} ${isAsc ? styles.sortIconActive : styles.sortIcon}`}
        />
      </span>
    );
  };

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getReceivedPurchaseOrdersPage(
        currentPage,
        debouncedQuery || undefined,
        sortBy,
        sortDir,
        dateFrom || undefined,
        dateTo || undefined,
        supplierFilter ? Number(supplierFilter.id) : undefined,
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
  }, [currentPage, debouncedQuery, sortBy, sortDir, dateFrom, dateTo, showToast, supplierFilter]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      await Promise.resolve();
      if (active) {
        fetchReceipts();
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [fetchReceipts]);

  const filteredReceipts = useMemo(() => {
    if (!paymentStatusFilter) return receipts;
    return receipts.filter((r) => r.paymentStatus === paymentStatusFilter);
  }, [receipts, paymentStatusFilter]);

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

  const columns: TableColumn<PurchaseOrder>[] = [
    { key: "code", label: "Mã phiếu", width: "150px" },
    { key: "supplierName", label: "Nhà cung cấp" },
    {
      key: "totalQuantity",
      label: buildSortHeader("SL Nhập", "totalQuantity"),
      width: "90px",
      align: "center",
      render: (val) => (
        <span style={{ fontWeight: 600 }}>{val as number}</span>
      ),
    },
    {
      key: "totalAmount",
      label: buildSortHeader("Tổng tiền", "totalAmount"),
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
      label: buildSortHeader("Ngày nhập", "receivedDate"),
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

        <div className={styles.filterBar}>
          {/* Lọc trạng thái thanh toán (client-side) */}
          <div className={styles.filterGroup}>
            <Select
              id="paymentStatusFilter"
              options={[
                { value: "", label: "Tất cả thanh toán" },
                { value: "PAID", label: "Đã thanh toán" },
                { value: "PARTIALLY_PAID", label: "Thanh toán một phần" },
                { value: "UNPAID", label: "Chưa thanh toán" },
              ]}
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Lọc theo nhà cung cấp */}
          <div className={styles.filterGroup}>
            <SupplierSearchDropdown
              value={supplierFilter}
              onSelect={(s) => {
                setSupplierFilter(s);
                setCurrentPage(1);
              }}
              placeholder="Tất cả nhà cung cấp"
            />
          </div>

          {/* Lọc thời gian theo receivedDate */}
          <div className={styles.dateFilterGroup}>
            <Select
              id="datePresetFilter"
              options={DATE_PRESET_OPTIONS}
              value={datePreset}
              onChange={(e) => {
                const val = e.target.value as DatePreset | "";
                setDatePreset(val);
                setCurrentPage(1);
                if (val === "") {
                  setDateFrom("");
                  setDateTo("");
                  setCustomFrom("");
                  setCustomTo("");
                } else if (val !== "custom") {
                  const { from, to } = getDateRangeForPreset(val);
                  setDateFrom(toIsoLocal(from, false));
                  setDateTo(toIsoLocal(to, true));
                  setCustomFrom("");
                  setCustomTo("");
                } else {
                  setDateFrom("");
                  setDateTo("");
                }
              }}
            />

            {/* Custom date inputs — chỉ hiện khi chọn "Tự chọn" */}
            {datePreset === "custom" && (
              <div className={styles.customDateRow}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  aria-label="Từ ngày"
                />
                <span className={styles.dateSeparator}>→</span>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  aria-label="Đến ngày"
                />
                <button
                  className={styles.applyDateBtn}
                  onClick={() => {
                    if (!customFrom || !customTo) {
                      showToast("Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc", "warning");
                      return;
                    }
                    if (customFrom > customTo) {
                      showToast("Ngày bắt đầu không thể sau ngày kết thúc", "warning");
                      return;
                    }
                    setDateFrom(toIsoLocal(customFrom, false));
                    setDateTo(toIsoLocal(customTo, true));
                    setCurrentPage(1);
                  }}
                >
                  <i className="fi fi-rr-check" />
                  Áp dụng
                </button>
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardHeader
            title="Danh sách phiếu nhập kho"
            actions={
              <SearchBox
                placeholder="Tìm mã phiếu..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                onClear={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
              />
            }
          />
          <CardBody className={styles.tableBody}>
            <Table
              columns={columns}
              data={filteredReceipts}
              rowKey="id"
              loading={loading}
              emptyText="Chưa có phiếu nhập nào"
            />
            {totalElements > 0 && (
              <div className={styles.paginationWrap}>
                <Pagination
                  pagination={{ page: currentPage, pageSize, total: totalElements }}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </CardBody>
        </Card>
      </div>

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
            onSupplierClick={setQuickViewSupplierId}
            onVariantClick={setQuickViewVariantId}
          />
        )}
      </Modal>

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
            onUserClick={(id, name) => { setQuickViewUserId(id); setQuickViewUserName(name); }}
          />
        )}
      </Modal>

      {/* Quick-view modals: thông tin tương tác read-only */}
      <SupplierDetailModal
        supplierId={quickViewSupplierId}
        onClose={() => setQuickViewSupplierId(null)}
      />
      <VariantDetailModal
        variantId={quickViewVariantId}
        onClose={() => setQuickViewVariantId(null)}
      />
      <UserDetailModal
        userId={quickViewUserId}
        userName={quickViewUserName}
        onClose={() => { setQuickViewUserId(null); setQuickViewUserName(""); }}
      />
    </section>
  );
}
