import { useState, useEffect, useCallback, useMemo } from "react";
import type { PurchaseOrder } from "../../../types/purchaseOrder.types";
import type { TableColumn } from "../../../types/common.types";
import { Button } from "../../../components/Button/Button";
import { Card, CardHeader, CardBody } from "../../../components/Card/Card";
import { Modal } from "../../../components/Modal/Modal";
import { SearchBox } from "../../../components/SearchBox/SearchBox";
import { Select } from "../../../components/Select/Select";
import { Table } from "../../../components/Table/Table";
import { Pagination } from "../../../components/Pagination/Pagination";
import { useToast } from "../../../components/Toast/ToastContext";
import { SupplierDetailModal } from "../../../components/SupplierDetailModal/SupplierDetailModal";
import { VariantDetailModal } from "../../../components/VariantDetailModal/VariantDetailModal";
import { UserDetailModal } from "../../../components/UserDetailModal/UserDetailModal";
import { SupplierSearchDropdown, type SupplierOption } from "../../../components/SupplierSearchDropdown/SupplierSearchDropdown";

import { getReceivedPurchaseOrdersPage } from "../../../services/purchaseOrder";
import { formatCurrency, formatDateTime } from "../../../utils/formatters";
import { type DatePreset, DATE_PRESET_OPTIONS, toIsoLocal, getDateRangeForPreset } from "../../../utils/datePreset";

import { PaymentModal } from "../../../features/warehouseReceipts/components/PaymentModal";
import { ReceiptDetailView } from "../../../features/warehouseReceipts/components/ReceiptDetailView";

import styles from "./WarehouseReceipt.module.css";

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

export function WarehouseReceiptPage() {
  const { showToast } = useToast();

  // List state
  const [receipts, setReceipts] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Sort
  const [sortBy, setSortBy] = useState<"receivedDate" | "totalAmount" | "totalQuantity">("receivedDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Filters
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<SupplierOption | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset | "">("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modals
  const [detailReceipt, setDetailReceipt] = useState<PurchaseOrder | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<PurchaseOrder | null>(null);
  const [quickViewSupplierId, setQuickViewSupplierId] = useState<string | null>(null);
  const [quickViewVariantId, setQuickViewVariantId] = useState<string | null>(null);
  const [quickViewUserId, setQuickViewUserId] = useState<string | null>(null);
  const [quickViewUserName, setQuickViewUserName] = useState("");

  // ─── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(() => { setDebouncedQuery(searchQuery); setCurrentPage(1); }, 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getReceivedPurchaseOrdersPage(
        currentPage,
        debouncedQuery || undefined,
        sortBy, sortDir,
        dateFrom || undefined,
        dateTo || undefined,
        supplierFilter ? Number(supplierFilter.id) : undefined,
      );
      setReceipts(data.items);
      setTotalElements(data.totalElements);
      setPageSize(data.pageSize);
    } catch {
      showToast("Không thể tải danh sách phiếu nhập kho!", "error");
      setReceipts([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedQuery, sortBy, sortDir, dateFrom, dateTo, showToast, supplierFilter]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) fetchReceipts(); });
    return () => { active = false; };
  }, [fetchReceipts]);

  const filteredReceipts = useMemo(() => {
    if (!paymentStatusFilter) return receipts;
    return receipts.filter((r) => r.paymentStatus === paymentStatusFilter);
  }, [receipts, paymentStatusFilter]);

  const handlePaymentSuccess = useCallback((updatedReceipt: PurchaseOrder) => {
    setReceipts((prev) =>
      prev.map((r) => r.id === updatedReceipt.id ? { ...r, paymentStatus: updatedReceipt.paymentStatus } : r),
    );
    setDetailReceipt((prev) =>
      prev?.id === updatedReceipt.id ? { ...prev, paymentStatus: updatedReceipt.paymentStatus } : prev,
    );
  }, []);

  // ─── Sort header ──────────────────────────────────────────────────────────
  const handleSort = (field: "receivedDate" | "totalAmount" | "totalQuantity") => {
    if (sortBy === field) setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortDir("asc"); }
    setCurrentPage(1);
  };

  const buildSortHeader = (label: string, field: "receivedDate" | "totalAmount" | "totalQuantity") => {
    const isActive = sortBy === field;
    const isAsc = isActive && sortDir === "asc";
    return (
      <span className={styles.sortableHeader} onClick={() => handleSort(field)} role="button" tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleSort(field)}>
        {label}
        <i className={`${isAsc ? "fi fi-rr-caret-up" : "fi fi-rr-caret-down"} ${isActive ? styles.sortIconActive : styles.sortIcon}`} />
      </span>
    );
  };

  // ─── Date preset handler ──────────────────────────────────────────────────
  const handleDatePresetChange = (val: DatePreset | "") => {
    setDatePreset(val);
    setCurrentPage(1);
    if (val === "") { setDateFrom(""); setDateTo(""); setCustomFrom(""); setCustomTo(""); }
    else if (val !== "custom") {
      const { from, to } = getDateRangeForPreset(val);
      setDateFrom(toIsoLocal(from, false)); setDateTo(toIsoLocal(to, true));
      setCustomFrom(""); setCustomTo("");
    } else { setDateFrom(""); setDateTo(""); }
  };

  // ─── Table columns ────────────────────────────────────────────────────────
  const columns: TableColumn<PurchaseOrder>[] = [
    { key: "code", label: "Mã phiếu", width: "150px" },
    { key: "supplierName", label: "Nhà cung cấp" },
    {
      key: "totalQuantity", label: buildSortHeader("SL Nhập", "totalQuantity"),
      width: "90px", align: "center",
      render: (val) => <span style={{ fontWeight: 600 }}>{val as number}</span>,
    },
    {
      key: "totalAmount", label: buildSortHeader("Tổng tiền", "totalAmount"),
      width: "140px", align: "right",
      render: (val) => <strong style={{ color: "var(--color-primary)" }}>{formatCurrency(val as number)}</strong>,
    },
    {
      key: "paymentStatus", label: "Thanh toán", width: "160px", align: "center",
      render: (val) => {
        const v = val as string;
        const color = PAYMENT_STATUS_COLOR[v] ?? { bg: "#fee2e2", text: "#991b1b" };
        return (
          <span style={{ background: color.bg, color: color.text, padding: "4px 10px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 }}>
            {PAYMENT_STATUS_LABEL[v] ?? v}
          </span>
        );
      },
    },
    {
      key: "receivedDate", label: buildSortHeader("Ngày nhập", "receivedDate"),
      width: "130px", render: (val) => (val ? formatDateTime(val as string) : "—"),
    },
    {
      key: "id", label: "Hành động", width: "100px", align: "center",
      render: (_, row) => (
        <Button variant="ghost" size="sm" icon="fi fi-rr-eye" onClick={() => setDetailReceipt(row)}>Xem</Button>
      ),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <section>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Phiếu nhập kho</h2>
            <p className={styles.subtitle}>{totalElements} phiếu nhập</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className={styles.filterBar}>
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
              onChange={(e) => { setPaymentStatusFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className={styles.filterGroup}>
            <SupplierSearchDropdown
              value={supplierFilter}
              onSelect={(s) => { setSupplierFilter(s); setCurrentPage(1); }}
              placeholder="Tất cả nhà cung cấp"
            />
          </div>
          <div className={styles.dateFilterGroup}>
            <Select
              id="datePresetFilter"
              options={DATE_PRESET_OPTIONS}
              value={datePreset}
              onChange={(e) => handleDatePresetChange(e.target.value as DatePreset | "")}
            />
            {datePreset === "custom" && (
              <div className={styles.customDateRow}>
                <input type="date" className={styles.dateInput} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} aria-label="Từ ngày" />
                <span className={styles.dateSeparator}>→</span>
                <input type="date" className={styles.dateInput} value={customTo} onChange={(e) => setCustomTo(e.target.value)} aria-label="Đến ngày" />
                <button className={styles.applyDateBtn} onClick={() => {
                  if (!customFrom || !customTo) { showToast("Vui lòng chọn đầy đủ ngày", "warning"); return; }
                  if (customFrom > customTo) { showToast("Ngày bắt đầu không thể sau ngày kết thúc", "warning"); return; }
                  setDateFrom(toIsoLocal(customFrom, false)); setDateTo(toIsoLocal(customTo, true)); setCurrentPage(1);
                }}>
                  <i className="fi fi-rr-check" /> Áp dụng
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
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                onClear={() => { setSearchQuery(""); setCurrentPage(1); }}
              />
            }
          />
          <CardBody className={styles.tableBody}>
            <Table columns={columns} data={filteredReceipts} rowKey="id" loading={loading} emptyText="Chưa có phiếu nhập nào" />
            {totalElements > 0 && (
              <div className={styles.paginationWrap}>
                <Pagination pagination={{ page: currentPage, pageSize, total: totalElements }} onPageChange={setCurrentPage} />
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Detail modal */}
      <Modal isOpen={!!detailReceipt} onClose={() => setDetailReceipt(null)} title="Chi tiết phiếu nhập kho" size="lg">
        {detailReceipt && (
          <ReceiptDetailView
            receipt={detailReceipt}
            onClose={() => setDetailReceipt(null)}
            onPay={() => { setPaymentReceipt(detailReceipt); setDetailReceipt(null); }}
            onSupplierClick={setQuickViewSupplierId}
            onVariantClick={setQuickViewVariantId}
          />
        )}
      </Modal>

      {/* Payment modal */}
      <Modal isOpen={!!paymentReceipt} onClose={() => setPaymentReceipt(null)} title="Thanh toán phiếu nhập kho" size="xl">
        {paymentReceipt && (
          <PaymentModal
            receipt={paymentReceipt}
            onClose={() => setPaymentReceipt(null)}
            onSuccess={(updated) => { handlePaymentSuccess(updated); setPaymentReceipt(updated); }}
            onUserClick={(id, name) => { setQuickViewUserId(id); setQuickViewUserName(name); }}
          />
        )}
      </Modal>

      {/* Quick-view modals */}
      <SupplierDetailModal supplierId={quickViewSupplierId} onClose={() => setQuickViewSupplierId(null)} />
      <VariantDetailModal variantId={quickViewVariantId} onClose={() => setQuickViewVariantId(null)} />
      <UserDetailModal userId={quickViewUserId} userName={quickViewUserName}
        onClose={() => { setQuickViewUserId(null); setQuickViewUserName(""); }} />
    </section>
  );
}
