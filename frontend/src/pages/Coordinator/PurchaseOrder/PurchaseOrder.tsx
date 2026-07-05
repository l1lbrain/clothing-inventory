import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "../../../components/Button/Button";
import { Card, CardHeader, CardBody } from "../../../components/Card/Card";
import { Modal } from "../../../components/Modal/Modal";
import { Select } from "../../../components/Select/Select";
import { Input } from "../../../components/Input/Input";
import { SearchBox } from "../../../components/SearchBox/SearchBox";
import { ConfirmDialog } from "../../../components/ConfirmDialog/ConfirmDialog";
import { Table } from "../../../components/Table/Table";
import { Pagination } from "../../../components/Pagination/Pagination";
import { useToast } from "../../../components/Toast/ToastContext";
import { getSuppliersPage } from "../../../services/supplier";
import { getProductsPage } from "../../../services/product";
import {
  getPurchaseOrdersPage,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
} from "../../../services/purchaseOrder";
import type { PurchaseOrderCreateRequestDto } from "../../../services/purchaseOrder";
import { formatCurrency, formatDateTime } from "../../../utils/formatters";
import type { TableColumn } from "../../../types/common.types";
import type { PurchaseOrder } from "../../../types/purchaseOrder.types";
import type { Supplier } from "../../../types/supplier.types";
import type { Product } from "../../../types/product.types";
import styles from "./PurchaseOrder.module.css";


const ORDER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Nháp",
  PENDING: "Chờ nhập",
  RECEIVED: "Đã nhận hàng",
  CANCELLED: "Đã huỷ",
};

// Định dạng tên hiển thị của biến thể
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

// Định dạng thời gian hiện tại theo múi giờ trình duyệt (không có UTC offset)
// để backend nhận LocalDateTime chính xác (giống Phiếu nhập kho)
function nowLocalIsoString(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  );
}

// --- Bộ lọc thời gian ---
type DatePreset = "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "custom";

const DATE_PRESET_OPTIONS: { value: DatePreset | ""; label: string }[] = [
  { value: "",           label: "Tất cả thời gian" },
  { value: "thisWeek",   label: "Tuần này" },
  { value: "lastWeek",   label: "Tuần trước" },
  { value: "thisMonth",  label: "Tháng này" },
  { value: "lastMonth",  label: "Tháng trước" },
  { value: "custom",     label: "Tự chọn..." },
];

/**
 * Định dạng một Date thành chuỗi "YYYY-MM-DD" (local, không có UTC offset).
 */
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
  // Offset để về Thứ Hai (nếu CN thì lùi 6 ngày, còn lại lùi dayOfWeek - 1)
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

  // "custom" — caller tự xử lý
  return { from: "", to: "" };
}

/**
 * Chuyển chuỗi "YYYY-MM-DD" sang ISO LocalDateTime với giờ 00:00:00 hoặc 23:59:59.
 */
function toIsoLocal(dateStr: string, endOfDay: boolean): string {
  return `${dateStr}T${endOfDay ? "23:59:59" : "00:00:00"}`;
}


interface SearchableProductDropdownProps {
  value: string;
  onChange: (val: string) => void;
  products: Product[];
  selectedIds: string[];
}

function SearchableProductDropdown({
  value,
  onChange,
  products,
  selectedIds,
}: SearchableProductDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }, [products, search]);

  const selectedProduct = products.find((p) => p.id === value);

  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      <div
        className={styles.dropdownTrigger}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>
          {selectedProduct
            ? `${selectedProduct.sku} - ${selectedProduct.name}`
            : "-- Chọn sản phẩm --"}
        </span>
        <i className={`fi fi-rr-angle-small-${isOpen ? "up" : "down"}`} />
      </div>
      {isOpen && (
        <div className={styles.dropdownMenu}>
          <div className={styles.dropdownSearchWrapper}>
            <i className="fi fi-rr-search" />
            <input
              type="text"
              className={styles.dropdownSearchInput}
              placeholder="Tìm theo SKU hoặc tên sản phẩm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className={styles.dropdownList}>
            {filtered.length === 0 ? (
              <div className={styles.noResults}>Không tìm thấy sản phẩm</div>
            ) : (
              filtered.slice(0, 30).map((p) => {
                const isAlreadySelected = selectedIds.includes(p.id);
                const isCurrentSelected = p.id === value;
                const isSelectedAnywhere = isAlreadySelected || isCurrentSelected;

                return (
                  <div
                    key={p.id}
                    className={[
                      styles.dropdownItem,
                      isCurrentSelected ? styles.activeItem : "",
                    ].join(" ")}
                    style={{
                      opacity: isAlreadySelected ? 0.5 : 1,
                      cursor: isAlreadySelected ? "not-allowed" : "pointer",
                      paddingRight: isSelectedAnywhere ? "32px" : "12px",
                    }}
                    onClick={() => {
                      if (isAlreadySelected) return;
                      onChange(p.id);
                      setIsOpen(false);
                      setSearch("");
                    }}
                  >
                    <span className={styles.itemName}>{p.name}</span>
                    <span className={styles.itemSku}>{p.sku}</span>
                    {isSelectedAnywhere && (
                      <div className={styles.checkmarkWrapper}>
                        <i className="fi fi-rr-check-circle" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}


interface LineItem {
  _key: string; // key nội bộ để render danh sách
  variantId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

const EMPTY_LINE: LineItem = {
  _key: "",
  variantId: "",
  sku: "",
  productName: "",
  quantity: 1,
  unitPrice: 0,
  lineTotal: 0,
};


export function PurchaseOrderPage() {
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [sortBy, setSortBy] = useState<"orderDate" | "totalAmount" | "totalQuantity">("orderDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState("");

  // Bộ lọc thời gian
  const [datePreset, setDatePreset] = useState<DatePreset | "">("");
  const [customFrom, setCustomFrom] = useState(""); // "YYYY-MM-DD"
  const [customTo, setCustomTo]     = useState(""); // "YYYY-MM-DD"
  const [dateFrom, setDateFrom]     = useState(""); // ISO LocalDateTime gửi lên BE
  const [dateTo, setDateTo]         = useState(""); // ISO LocalDateTime gửi lên BE

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<PurchaseOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [confirmReceive, setConfirmReceive] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const [formSupplierId, setFormSupplierId] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formLines, setFormLines] = useState<LineItem[]>([
    { ...EMPTY_LINE, _key: "1" },
  ]);
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    getSuppliersPage(1)
      .then(async (first) => {
        let all = [...first.items];
        for (let p = 2; p <= first.totalPages; p++) {
          const page = await getSuppliersPage(p);
          all = all.concat(page.items);
        }
        setSuppliers(all.filter((s) => s.status === "active"));
      })
      .catch(console.error);

    getProductsPage(1)
      .then(async (first) => {
        let all = [...first.items];
        for (let p = 2; p <= first.totalPages; p++) {
          const page = await getProductsPage(p);
          all = all.concat(page.items);
        }
        // Flatten: mỗi variant thành một "product" entry để chọn trong dropdown
        const flattened: Product[] = all
          .filter((p) => !p.status || p.status.toUpperCase() === "ACTIVE")
          .flatMap((p) =>
            (p.variants || [])
              .filter((v) => !v.status || v.status.toUpperCase() === "ACTIVE")
              .map((v) => ({
                id: String(v.id),
                code: p.code,
                sku: v.sku,
                name: p.name,
                category: p.category,
                categoryLabel: p.categoryLabel,
                importPrice: v.importPrice,
                salePrice: v.salePrice,
                unit: p.unit || "Cái",
                stock: v.stock,
                description: p.description,
                image: p.image,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
                option1Value: v.option1Value,
                option2Value: v.option2Value,
                option3Value: v.option3Value,
                variants: [],
              })),
          );
        setProducts(flattened);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Xử lý khi người dùng bấm vào header cột có thể sort
  const handleSort = (field: "orderDate" | "totalAmount" | "totalQuantity") => {
    console.log("[PurchaseOrder Sort] Clicked:", field, "Current state:", { sortBy, sortDir });
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  // Render label header có thể sort kèm icon chỉ hướng
  const buildSortHeader = (
    label: string,
    field: "orderDate" | "totalAmount" | "totalQuantity",
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

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await getPurchaseOrdersPage(
          currentPage,
          debouncedQuery || undefined,
          statusFilter || undefined,
          sortBy,
          sortDir,
          dateFrom || undefined,
          dateTo || undefined,
        );
        setOrders(data.items);
        setTotalElements(data.totalElements);
        setPageSize(data.pageSize);
      } catch (err) {
        console.error("Failed to fetch purchase orders:", err);
        showToast("Không thể tải danh sách đơn đặt hàng!", "error");
        setOrders([]);
        setTotalElements(0);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [currentPage, refreshTrigger, debouncedQuery, sortBy, sortDir, showToast, statusFilter, dateFrom, dateTo]);

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  // Luôn dùng s.id (đã là chuỗi số nguyên hợp lệ sau khi mapper chạy String(s.id))
  const supplierOptions = useMemo(
    () =>
      suppliers.map((s) => ({
        value: s.id,
        label: s.companyName,
      })),
    [suppliers],
  );

  const updateLine = (
    idx: number,
    field: keyof LineItem,
    val: string | number,
  ) => {
    if (field === "variantId" && val) {
      const isDuplicate = formLines.some(
        (line, i) => i !== idx && line.variantId === String(val),
      );
      if (isDuplicate) {
        showToast("Sản phẩm này đã có trong danh sách đặt hàng", "warning");
        return;
      }
    }

    setFormLines((prev) =>
      prev.map((line, i) => {
        if (i !== idx) return line;
        if (field === "variantId") {
          const p = products.find((pr) => pr.id === String(val));
          if (!p) return { ...line, variantId: String(val) };
          return {
            ...line,
            variantId: p.id,
            sku: p.sku,
            productName: p.name,
            unitPrice: p.importPrice,
            lineTotal: p.importPrice * line.quantity,
          };
        }
        const updated = { ...line, [field]: val };
        if (field === "quantity" || field === "unitPrice") {
          updated.lineTotal =
            (updated.quantity || 0) * (updated.unitPrice || 0);
        }
        return updated;
      }),
    );
  };

  const addLine = () =>
    setFormLines((prev) => [
      ...prev,
      { ...EMPTY_LINE, _key: String(Date.now()) },
    ]);

  const removeLine = (idx: number) =>
    setFormLines((prev) => prev.filter((_, i) => i !== idx));

  const totalQty = useMemo(
    () => formLines.reduce((s, l) => s + (l.quantity || 0), 0),
    [formLines],
  );
  const totalAmount = useMemo(
    () => formLines.reduce((s, l) => s + (l.lineTotal || 0), 0),
    [formLines],
  );

  const resetForm = () => {
    setFormSupplierId("");
    setFormNote("");
    setFormLines([{ ...EMPTY_LINE, _key: "1" }]);
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  // Mở form sửa — nạp dữ liệu đơn hiện tại vào form
  const openEdit = (order: PurchaseOrder) => {
    setFormSupplierId(order.supplierId);
    setFormNote(order.note);
    setFormLines(
      order.details.map((d) => ({
        _key: d.id,
        variantId: d.variantId,
        sku: d.sku,
        productName: d.sku, // hiển thị SKU vì không có tên variant riêng trong detail
        quantity: d.quantity,
        unitPrice: d.unitPrice,
        lineTotal: d.lineTotal,
      })),
    );
    setEditingOrder(order);
    setDetailOrder(null);
  };

  const handleCreate = async () => {
    if (!formSupplierId) {
      showToast("Vui lòng chọn nhà cung cấp", "warning");
      return;
    }
    const validLines = formLines.filter((l) => l.variantId && l.quantity > 0);
    if (validLines.length === 0) {
      showToast("Vui lòng thêm ít nhất một sản phẩm hợp lệ", "warning");
      return;
    }

    // formSupplierId là chuỗi số nguyên hợp lệ (vd: "1", "2")
    // do supplierOptions.value luôn dùng s.id = String(numericId)
    const supplierIdNum = Number(formSupplierId);
    if (!supplierIdNum || isNaN(supplierIdNum)) {
      showToast("ID nhà cung cấp không hợp lệ, vui lòng chọn lại", "error");
      return;
    }

    const now = nowLocalIsoString();
    const autoCode = `PO-${Date.now()}`;

    const payload: PurchaseOrderCreateRequestDto = {
      code: autoCode,
      supplierId: supplierIdNum,
      orderDate: now,
      note: formNote || undefined,
      details: validLines.map((l) => ({
        variantId: Number(l.variantId),
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
    };

    try {
      setFormSubmitting(true);
      await createPurchaseOrder(payload);
      showToast("Tạo đơn đặt hàng thành công!", "success");
      setIsCreateOpen(false);
      resetForm();
      triggerRefresh();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Không thể tạo đơn đặt hàng";
      showToast(msg, "error");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    if (!formSupplierId) {
      showToast("Vui lòng chọn nhà cung cấp", "warning");
      return;
    }
    const validLines = formLines.filter((l) => l.variantId && l.quantity > 0);
    if (validLines.length === 0) {
      showToast("Vui lòng thêm ít nhất một sản phẩm hợp lệ", "warning");
      return;
    }
    const supplierIdNum = Number(formSupplierId);
    if (!supplierIdNum || isNaN(supplierIdNum)) {
      showToast("ID nhà cung cấp không hợp lệ, vui lòng chọn lại", "error");
      return;
    }
    const payload: PurchaseOrderCreateRequestDto = {
      code: editingOrder.code, // Giữ nguyên mã đơn gốc khi sửa
      supplierId: supplierIdNum,
      orderDate: editingOrder.orderDate,
      note: formNote || undefined,
      details: validLines.map((l) => ({
        variantId: Number(l.variantId),
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
    };
    try {
      setFormSubmitting(true);
      await updatePurchaseOrder(editingOrder.id, payload);
      showToast("Lưu thành công!", "success");
      setEditingOrder(null);
      resetForm();
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể lưu đơn hàng";
      showToast(msg, "error");
    } finally {
      setFormSubmitting(false);
    }
  };


  const handleUpdateStatus = async (
    id: string,
    status: PurchaseOrder["status"],
  ) => {
    const toastLabels: Partial<Record<PurchaseOrder["status"], string>> = {
      PENDING: "Đã duyệt đơn hàng!",
      RECEIVED: "Đã xác nhận nhận hàng!",
      CANCELLED: "Đã huỷ đơn hàng!",
    };
    try {
      await updatePurchaseOrderStatus(id, status);
      showToast(toastLabels[status] ?? "Đã cập nhật trạng thái!", "success");
      setConfirmReceive(null);
      setConfirmPending(null);
      setConfirmCancel(null);
      setDetailOrder(null);
      triggerRefresh();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Không thể cập nhật trạng thái";
      showToast(msg, "error");
    }
  };

  const renderForm = () => (
    <div className={styles.form}>
      <div className={styles.formRow}>
        <Select
          id="po-supplier"
          label="Nhà cung cấp"
          required
          options={supplierOptions}
          placeholder="Chọn nhà cung cấp"
          value={formSupplierId}
          onChange={(e) => setFormSupplierId(e.target.value)}
        />
        <Input
          id="po-note"
          label="Ghi chú"
          value={formNote}
          onChange={(e) => setFormNote(e.target.value)}
          placeholder="Ghi chú thêm..."
        />
      </div>

      <div className={styles.itemsSection}>
        <div className={styles.itemsHeader}>
          <span className={styles.itemsLabel}>Danh sách hàng đặt</span>
          <Button variant="ghost" size="sm" icon="fi fi-rr-add" onClick={addLine}>
            Thêm dòng
          </Button>
        </div>
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th style={{ width: 80 }}>SL</th>
              <th style={{ width: 140 }}>Đơn giá nhập</th>
              <th style={{ width: 130 }}>Thành tiền</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {formLines.map((line, idx) => (
              <tr key={line._key}>
                <td>
                  <SearchableProductDropdown
                    value={line.variantId}
                    onChange={(val) => updateLine(idx, "variantId", val)}
                    products={products}
                    selectedIds={formLines
                      .filter((_, i) => i !== idx)
                      .map((l) => l.variantId)
                      .filter(Boolean)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    className={styles.lineInput}
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(idx, "quantity", Number(e.target.value))
                    }
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className={styles.lineInput}
                    value={
                      line.unitPrice
                        ? new Intl.NumberFormat("vi-VN").format(line.unitPrice)
                        : ""
                    }
                    readOnly
                    style={{
                      backgroundColor: "var(--color-bg)",
                      color: "var(--color-subtext)",
                      cursor: "not-allowed",
                    }}
                  />
                </td>
                <td style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                  {line.lineTotal ? formatCurrency(line.lineTotal) : "—"}
                </td>
                <td>
                  {formLines.length > 1 && (
                    <button
                      className={styles.removeItemBtn}
                      onClick={() => removeLine(idx)}
                    >
                      <i className="fi fi-rr-trash" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDetail = (order: PurchaseOrder) => (
    <div className={styles.detailSection}>
      <div className={styles.detailHeader}>
        <div>
          <div className={styles.detailCode}>{order.code}</div>
          <div className={styles.detailSupplier}>{order.supplierName}</div>
        </div>
        <span className={[styles.badge, styles[order.status]].join(" ")}>
          {ORDER_STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      <div className={styles.detailMeta}>
        <span>
          <i className="fi fi-rr-calendar" style={{ marginRight: 4 }} />
          Ngày đặt hàng: {formatDateTime(order.orderDate)}
        </span>
        {order.receivedDate && (
          <span>
            <i className="fi fi-rr-box-check" style={{ marginRight: 4 }} />
            Ngày nhận hàng: {formatDateTime(order.receivedDate)}
          </span>
        )}
        <span>
          <i className="fi fi-rr-user" style={{ marginRight: 4 }} />
          Người tạo: {order.createdByName}
        </span>
        {order.note && (
          <span>
            <i className="fi fi-rr-note" style={{ marginRight: 4 }} />
            Ghi chú: {order.note}
          </span>
        )}
      </div>

      <table className={styles.readonlyTable}>
        <thead>
          <tr>
            <th>Tên sản phẩm</th>
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
                  {formatVariantName(
                    item.productName,
                    item.option1Value,
                    item.option2Value,
                    item.option3Value,
                  )}
                </div>
                <div style={{ color: "var(--color-subtext)", fontSize: "0.75rem", marginTop: 2 }}>
                  {item.sku}
                </div>
              </td>
              <td style={{ textAlign: "right" }}>{item.quantity}</td>
              <td style={{ textAlign: "right" }}>
                {formatCurrency(item.unitPrice)}
              </td>
              <td style={{ textAlign: "right" }} className={styles.amountCell}>
                {formatCurrency(item.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.detailTotal}>
        <span>Tổng tiền:</span>
        <span className={styles.detailTotalAmount}>
          {formatCurrency(order.totalAmount)}
        </span>
      </div>

      <div className={styles.modalFooter}>
        <Button variant="secondary" onClick={() => setDetailOrder(null)}>
          Đóng
        </Button>
        {order.status !== "RECEIVED" && (
          <>
            {order.status === "DRAFT" && (
              <Button
                variant="secondary"
                icon="fi fi-rr-edit"
                onClick={() => openEdit(order)}
              >
                Sửa
              </Button>
            )}

            {order.status === "DRAFT" && (
              <Button
                icon="fi fi-rr-check"
                onClick={() => {
                  setDetailOrder(null);
                  setConfirmPending(order.id);
                }}
              >
                Duyệt
              </Button>
            )}
            {order.status === "PENDING" && (
              <Button
                icon="fi fi-rr-box-check"
                onClick={() => {
                  setDetailOrder(null);
                  setConfirmReceive(order.id);
                }}
              >
                Nhập hàng
              </Button>
            )}

            {order.status !== "CANCELLED" && (
              <Button
                variant="danger"
                icon="fi fi-rr-cross-circle"
                onClick={() => {
                  setDetailOrder(null);
                  setConfirmCancel(order.id);
                }}
              >
                Huỷ đơn
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );

  const columns: TableColumn<PurchaseOrder>[] = [
    { key: "code", label: "Mã đơn", width: "140px" },
    { key: "supplierName", label: "Nhà cung cấp" },
    {
      key: "totalQuantity",
      label: buildSortHeader("SL Đặt", "totalQuantity"),
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
      key: "status",
      label: "Trạng thái",
      width: "120px",
      align: "center",
      render: (val) => (
        <span className={[styles.badge, styles[val as string]].join(" ")}>
          {ORDER_STATUS_LABEL[val as string] ?? (val as string)}
        </span>
      ),
    },
    {
      key: "orderDate",
      label: buildSortHeader("Ngày đặt", "orderDate"),
      width: "130px",
      render: (val) => formatDateTime(val as string),
    },
    {
      key: "id",
      label: "Hành động",
      width: "100px",
      align: "center",
      render: (_, row) => (
        <div className={styles.actionBtns} style={{ justifyContent: "center" }}>
          <Button
            variant="ghost"
            size="sm"
            icon="fi fi-rr-eye"
            onClick={() => setDetailOrder(row)}
          >
            Xem
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Đơn đặt hàng</h2>
            <p className={styles.subtitle}>{totalElements} đơn</p>
          </div>
          <Button icon="fi fi-rr-add" onClick={openCreate}>
            Tạo đơn đặt hàng
          </Button>
        </div>

        <div className={styles.filterBar}>
          {/* Lọc trạng thái */}
          <div className={styles.filterGroup}>
            <Select
              id="statusFilter"
              options={[
                { value: "", label: "Tất cả trạng thái" },
                { value: "DRAFT", label: "Nháp" },
                { value: "PENDING", label: "Chờ nhập hàng" },
                { value: "RECEIVED", label: "Đã nhận hàng" },
              ]}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Lọc thời gian */}
          <div className={styles.dateFilterGroup}>
            <Select
              id="datePresetFilter"
              options={DATE_PRESET_OPTIONS}
              value={datePreset}
              onChange={(e) => {
                const val = e.target.value as DatePreset | "";
                setDatePreset(val);
                setCurrentPage(1);
                if (val === "" ) {
                  // Xóa filter
                  setDateFrom("");
                  setDateTo("");
                  setCustomFrom("");
                  setCustomTo("");
                } else if (val !== "custom") {
                  // Preset cố định: tính range và áp dụng luôn
                  const { from, to } = getDateRangeForPreset(val);
                  setDateFrom(toIsoLocal(from, false));
                  setDateTo(toIsoLocal(to, true));
                  setCustomFrom("");
                  setCustomTo("");
                } else {
                  // "custom": chờ người dùng nhập rồi bấm Áp dụng
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
            title="Danh sách đơn đặt hàng"
            actions={
              <SearchBox
                placeholder="Tìm mã đơn, NCC..."
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
          <CardBody className={styles.tableCardBody}>
            <Table
              columns={columns}
              data={orders}
              rowKey="id"
              loading={loading}
              emptyText="Chưa có đơn đặt hàng nào"
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
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Tạo đơn đặt hàng mới"
        size="xxl"
      >
        {renderForm()}
        <div className={styles.modalFooter}>
          <div className={styles.footerSummary}>
            Tổng số lượng:{" "}
            <strong style={{ color: "var(--color-text)" }}>{totalQty}</strong>
            <span style={{ margin: "0 12px", color: "var(--color-border)" }}>
              |
            </span>
            Tổng tiền:{" "}
            <strong className={styles.footerTotalAmount}>
              {formatCurrency(totalAmount)}
            </strong>
          </div>
          <Button
            variant="secondary"
            onClick={() => setIsCreateOpen(false)}
            disabled={formSubmitting}
          >
            Huỷ
          </Button>
          <Button
            icon="fi fi-rr-check"
            onClick={handleCreate}
            disabled={formSubmitting}
          >
            {formSubmitting ? "Đang tạo..." : "Tạo đơn"}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        title="Chi tiết đơn đặt hàng"
        size="lg"
      >
        {detailOrder && renderDetail(detailOrder)}
      </Modal>

      <Modal
        isOpen={!!editingOrder}
        onClose={() => { setEditingOrder(null); resetForm(); }}
        title={`Sửa đơn đặt hàng – ${editingOrder?.code ?? ""}`}
        size="xxl"
      >
        {renderForm()}
        <div className={styles.modalFooter}>
          <div className={styles.footerSummary}>
            Tổng số lượng:{" "}
            <strong style={{ color: "var(--color-text)" }}>{totalQty}</strong>
            <span style={{ margin: "0 12px", color: "var(--color-border)" }}>|</span>
            Tổng tiền:{" "}
            <strong className={styles.footerTotalAmount}>
              {formatCurrency(totalAmount)}
            </strong>
          </div>
          <Button
            variant="secondary"
            onClick={() => { setEditingOrder(null); resetForm(); }}
            disabled={formSubmitting}
          >
            Huỷ
          </Button>
          <Button
            icon="fi fi-rr-check"
            onClick={handleSaveEdit}
            disabled={formSubmitting}
          >
            {formSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmPending}
        title="Duyệt đơn đặt hàng?"
        message="Đơn hàng sẽ chuyển sang trạng thái 'Chờ nhập' và không thể chỉnh sửa. Bạn có chắc chắn?"
        confirmLabel="Duyệt đơn"
        cancelLabel="Huỷ"
        onConfirm={() =>
          confirmPending && handleUpdateStatus(confirmPending, "PENDING")
        }
        onCancel={() => setConfirmPending(null)}
      />

      <ConfirmDialog
        isOpen={!!confirmReceive}
        title="Xác nhận nhập hàng?"
        message="Sau khi xác nhận, trạng thái đơn sẽ chuyển thành 'Đã nhận hàng' và tồn kho sẽ được cập nhật."
        confirmLabel="Nhập hàng"
        cancelLabel="Huỷ"
        onConfirm={() =>
          confirmReceive && handleUpdateStatus(confirmReceive, "RECEIVED")
        }
        onCancel={() => setConfirmReceive(null)}
      />

      <ConfirmDialog
        isOpen={!!confirmCancel}
        title="Huỷ đơn đặt hàng?"
        message="Đơn hàng sẽ bị huỷ và không thể khôi phục. Bạn có chắc chắn?"
        confirmLabel="Xác nhận huỷ"
        cancelLabel="Không"
        onConfirm={() =>
          confirmCancel && handleUpdateStatus(confirmCancel, "CANCELLED")
        }
        onCancel={() => setConfirmCancel(null)}
      />
    </section>
  );
}
