import { useEffect, useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import styles from "./Dashboard.module.css";
import { Card, CardBody, CardHeader } from "../../components/Card/Card";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import { getLowStockVariantsPage } from "../../services/product";
import { getReceivedPurchaseOrdersPage } from "../../services/purchaseOrder";
import { getDashboardStats } from "../../services/dashboard";
import type { ProductVariantDetailResponseDto } from "../../services/product";
import type { PurchaseOrder } from "../../types/purchaseOrder.types";
import { getUserAuthorities } from "../../services/auth";
import { useToast } from "../../components/Toast/ToastContext";
import { ROUTES } from "../../constants/routes";
import { SearchBox } from "../../components/SearchBox/SearchBox";
import { Select } from "../../components/Select/Select";
import { Pagination } from "../../components/Pagination/Pagination";
import { Table } from "../../components/Table/Table";
import type { TableColumn } from "../../types/common.types";


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

type DatePreset = "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "custom";

const DATE_PRESET_OPTIONS: { value: DatePreset | ""; label: string }[] = [
  { value: "",           label: "Tất cả thời gian" },
  { value: "thisWeek",   label: "Tuần này" },
  { value: "lastWeek",   label: "Tuần trước" },
  { value: "thisMonth",  label: "Tháng này" },
  { value: "lastMonth",  label: "Tháng trước" },
  { value: "custom",     label: "Tự chọn..." },
];

function toDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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
    const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toDateString(first), to: toDateString(last) };
  }
  if (preset === "lastMonth") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last  = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toDateString(first), to: toDateString(last) };
  }
  return { from: "", to: "" };
}

function toIsoLocal(dateStr: string, endOfDay: boolean): string {
  return `${dateStr}T${endOfDay ? "23:59:59" : "00:00:00"}`;
}

export function Dashboard() {
  const authorities = getUserAuthorities();
  const isAdmin = authorities.includes("admin");
  const { showToast } = useToast();

  // Stats
  const [totalRevenue, setTotalRevenue] = useState<number | string>("...");
  const [supplierCount, setSupplierCount] = useState<number | string>("...");
  const [productCount, setProductCount] = useState<number | string>("...");
  const [totalStock, setTotalStock] = useState<number | string>("...");

  // Recent receipts (warehouse receipts)
  const [recentReceipts, setRecentReceipts] = useState<PurchaseOrder[]>([]);
  const [recentReceiptsTotal, setRecentReceiptsTotal] = useState(0);
  const [recentReceiptsPage, setRecentReceiptsPage] = useState(1);
  const [recentReceiptsPageSize, setRecentReceiptsPageSize] = useState(10);
  const [recentReceiptsLoading, setRecentReceiptsLoading] = useState(false);
  const [recentReceiptsKeyword, setRecentReceiptsKeyword] = useState("");
  const [debouncedReceiptsKeyword, setDebouncedReceiptsKeyword] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");

  // Bộ lọc thời gian cho phiếu nhập
  const [datePreset, setDatePreset] = useState<DatePreset | "">("");
  const [customFrom, setCustomFrom] = useState(""); // "YYYY-MM-DD"
  const [customTo, setCustomTo]     = useState(""); // "YYYY-MM-DD"
  const [dateFrom, setDateFrom]     = useState(""); // ISO LocalDateTime gửi lên BE
  const [dateTo, setDateTo]         = useState(""); // ISO LocalDateTime gửi lên BE

  // Low-stock variants
  const [lowStockItems, setLowStockItems] = useState<ProductVariantDetailResponseDto[]>([]);
  const [lowStockTotal, setLowStockTotal] = useState(0);
  const [lowStockPage, setLowStockPage] = useState(1);
  const [lowStockPageSize, setLowStockPageSize] = useState(10);
  const [lowStockLoading, setLowStockLoading] = useState(false);
  const [lowStockKeyword, setLowStockKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [lowStockStatus, setLowStockStatus] = useState<"" | "ACTIVE" | "INACTIVE">("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedKeyword(lowStockKeyword);
      setLowStockPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [lowStockKeyword]);

  // Load dashboard stats từ API
  useEffect(() => {
    if (!isAdmin) return;
    getDashboardStats()
      .then((res) => {
        setTotalRevenue(res.totalAmount ?? 0);
        setProductCount(res.totalProduct ?? 0);
        setSupplierCount(res.totalSupplier ?? 0);
        setTotalStock(res.totalInventory ?? 0);
      })
      .catch((err) => {
        console.error("Lỗi khi tải thông số thống kê dashboard:", err);
        setTotalRevenue(0);
        setProductCount(0);
        setSupplierCount(0);
        setTotalStock(0);
      });
  }, [isAdmin]);

  // Load low-stock variants từ API
  useEffect(() => {
    if (!isAdmin) return;
    const fetch = async () => {
      setLowStockLoading(true);
      try {
        const res = await getLowStockVariantsPage(
          lowStockPage,
          debouncedKeyword || undefined,
          lowStockStatus || undefined,
          "quantityOnHand",
          "asc",
        );
        setLowStockItems(res.items);
        setLowStockTotal(res.totalElements);
        setLowStockPageSize(res.pageSize);
      } catch {
        setLowStockItems([]);
      } finally {
        setLowStockLoading(false);
      }
    };
    fetch();
  }, [isAdmin, lowStockPage, debouncedKeyword, lowStockStatus]);

  // Debounce search for receipts
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedReceiptsKeyword(recentReceiptsKeyword);
      setRecentReceiptsPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [recentReceiptsKeyword]);

  // Load recent receipts từ API
  useEffect(() => {
    if (!isAdmin) return;
    const fetchReceipts = async () => {
      setRecentReceiptsLoading(true);
      try {
        const res = await getReceivedPurchaseOrdersPage(
          recentReceiptsPage,
          debouncedReceiptsKeyword || undefined,
          "createdAt",
          "desc",
          dateFrom || undefined,
          dateTo || undefined,
        );
        setRecentReceipts(res.items);
        setRecentReceiptsTotal(res.totalElements);
        setRecentReceiptsPageSize(res.pageSize);
      } catch (err) {
        console.error("Lỗi khi tải phiếu nhập kho gần đây:", err);
        setRecentReceipts([]);
      } finally {
        setRecentReceiptsLoading(false);
      }
    };
    fetchReceipts();
  }, [isAdmin, recentReceiptsPage, debouncedReceiptsKeyword, dateFrom, dateTo]);

  const filteredReceipts = useMemo(() => {
    if (!paymentStatusFilter) return recentReceipts;
    return recentReceipts.filter((r) => r.paymentStatus === paymentStatusFilter);
  }, [recentReceipts, paymentStatusFilter]);

  const recentReceiptsColumns: TableColumn<PurchaseOrder>[] = [
    { key: "code", label: "Mã phiếu", width: "150px" },
    { key: "supplierName", label: "Nhà cung cấp" },
    {
      key: "totalQuantity",
      label: "SL Nhập",
      width: "90px",
      align: "center",
      render: (val) => <span style={{ fontWeight: 600 }}>{val as number}</span>,
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
      width: "150px",
      render: (val) => (val ? formatDateTime(val as string) : "—"),
    },
  ];

  const lowStockColumns: TableColumn<ProductVariantDetailResponseDto>[] = [
    {
      key: "productName",
      label: "Tên sản phẩm",
      render: (_, v) => (
        <div>
          <div style={{ fontWeight: 500 }}>{v.productName}</div>
          <div style={{ fontSize: "var(--font-xs)", color: "var(--color-subtext)" }}>
            {v.categoryName}
          </div>
        </div>
      ),
    },
    { key: "sku", label: "SKU", width: "160px" },
    {
      key: "attributes",
      label: "Thuộc tính",
      render: (_, v) => {
        const summary = v.attributes
          ? Object.entries(v.attributes)
              .map(([k, val]) => `${k}: ${val}`)
              .join(" | ")
          : "—";
        return <span style={{ color: "var(--color-subtext)", fontSize: "var(--font-sm)" }}>{summary || "—"}</span>;
      },
    },
    {
      key: "quantityOnHand",
      label: "Tồn kho",
      width: "100px",
      align: "center",
      render: (val) => {
        const qty = val as number;
        return (
          <span
            style={{
              fontWeight: 600,
              color: qty < 10 ? "var(--color-danger)" : qty < 20 ? "var(--color-warning)" : "var(--color-success)",
            }}
          >
            {qty}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Trạng thái",
      width: "130px",
      align: "center",
      render: (val) => {
        const isActive = (val as string)?.toUpperCase() === "ACTIVE";
        return (
          <span
            style={{
              display: "inline-block",
              padding: "2px 10px",
              borderRadius: "var(--radius-full)",
              fontSize: "var(--font-xs)",
              fontWeight: 500,
              background: isActive ? "var(--color-success-light)" : "var(--color-hover)",
              color: isActive ? "var(--color-success)" : "var(--color-subtext)",
            }}
          >
            {isActive ? "Đang bán" : "Ngừng bán"}
          </span>
        );
      },
    },
  ];

  const stats = [
    {
      label: "Tổng tiền đã thanh toán",
      value: typeof totalRevenue === "number" ? formatCurrency(totalRevenue) : totalRevenue.toString(),
      icon: "fi fi-rr-sack-dollar",
      color: "primary",
    },
    {
      label: "Tổng sản phẩm",
      value: productCount.toString(),
      icon: "fi fi-rr-box-alt",
      color: "success",
    },
    {
      label: "Nhà cung cấp",
      value: supplierCount.toString(),
      icon: "fi fi-rr-building",
      color: "warning",
    },
    {
      label: "Tổng tồn kho",
      value: totalStock === "..." ? "..." : `${totalStock} sản phẩm`,
      icon: "fi fi-rr-warehouse-alt",
      color: "info",
    },
  ];

  if (!isAdmin) {
    return <Navigate to={ROUTES.PROFILE} replace />;
  }

  return (
    <section>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Quản trị hệ thống</h2>
            <p className={styles.subtitle}>Bảng quản lý dành riêng cho Admin</p>
          </div>
        </div>

        <div className={styles.statsGrid}>
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardBody className={styles.statCard}>
                <div className={[styles.statIcon, styles[stat.color]].join(" ")}>
                  <i className={stat.icon} aria-hidden />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>{stat.value}</span>
                  <span className={styles.statLabel}>{stat.label}</span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className={styles.content}>
          {/* Phiếu nhập gần đây */}
          <div>
            <div className={styles.filterBar}>
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
                  setRecentReceiptsPage(1);
                }}
              />
              <div className={styles.dateFilterGroup}>
                <Select
                  id="datePresetFilter"
                  options={DATE_PRESET_OPTIONS}
                  value={datePreset}
                  onChange={(e) => {
                    const val = e.target.value as DatePreset | "";
                    setDatePreset(val);
                    setRecentReceiptsPage(1);
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
                        setRecentReceiptsPage(1);
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
                title="Phiếu nhập gần đây"
                actions={
                  <SearchBox
                    placeholder="Tìm mã phiếu, NCC..."
                    value={recentReceiptsKeyword}
                    onChange={(e) => setRecentReceiptsKeyword(e.target.value)}
                    onClear={() => setRecentReceiptsKeyword("")}
                  />
                }
              />
              <CardBody className={styles.tableBody}>
                <Table
                  columns={recentReceiptsColumns}
                  data={filteredReceipts}
                  rowKey="id"
                  loading={recentReceiptsLoading}
                  emptyText="Chưa có giao dịch gần đây"
                />
                {recentReceiptsTotal > 0 && (
                  <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px", borderTop: "1px solid var(--color-border)" }}>
                    <Pagination
                      pagination={{ page: recentReceiptsPage, pageSize: recentReceiptsPageSize, total: recentReceiptsTotal }}
                      onPageChange={setRecentReceiptsPage}
                    />
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Sản phẩm sắp hết hàng */}
          <div>
            <div className={styles.filterBar}>
              <Select
                id="low-stock-status"
                options={[
                  { value: "", label: "Tất cả trạng thái" },
                  { value: "ACTIVE", label: "Đang bán" },
                  { value: "INACTIVE", label: "Ngừng bán" },
                ]}
                value={lowStockStatus}
                onChange={(e) => {
                  setLowStockStatus(e.target.value as "" | "ACTIVE" | "INACTIVE");
                  setLowStockPage(1);
                }}
              />
            </div>
            <Card>
              <CardHeader
                title="Sản phẩm sắp hết hàng"
                actions={
                  <SearchBox
                    placeholder="Tìm tên, SKU..."
                    value={lowStockKeyword}
                    onChange={(e) => setLowStockKeyword(e.target.value)}
                    onClear={() => setLowStockKeyword("")}
                  />
                }
              />
              <CardBody className={styles.tableBody}>
                <Table
                  columns={lowStockColumns}
                  data={lowStockItems}
                  rowKey="variantId"
                  loading={lowStockLoading}
                  emptyText="Không có sản phẩm nào sắp hết hàng"
                />
              {lowStockTotal > 0 && (
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px", borderTop: "1px solid var(--color-border)" }}>
                  <Pagination
                    pagination={{ page: lowStockPage, pageSize: lowStockPageSize, total: lowStockTotal }}
                    onPageChange={setLowStockPage}
                  />
                </div>
              )}
            </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
