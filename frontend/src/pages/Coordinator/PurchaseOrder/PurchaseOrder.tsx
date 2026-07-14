import { useState, useEffect } from "react";
import { Button } from "../../../components/Button/Button";
import { Card, CardHeader, CardBody } from "../../../components/Card/Card";
import { Table } from "../../../components/Table/Table";
import { Pagination } from "../../../components/Pagination/Pagination";
import { ConfirmDialog } from "../../../components/ConfirmDialog/ConfirmDialog";
import { SearchBox } from "../../../components/SearchBox/SearchBox";
import { useToast } from "../../../components/Toast/ToastContext";
import { SupplierDetailModal } from "../../../components/SupplierDetailModal/SupplierDetailModal";
import { VariantDetailModal } from "../../../components/VariantDetailModal/VariantDetailModal";
import { UserDetailModal } from "../../../components/UserDetailModal/UserDetailModal";

import { getProductsPage } from "../../../services/product";
import {
  getPurchaseOrdersPage,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  type PurchaseOrderCreateRequestDto,
} from "../../../services/purchaseOrder";
import { formatCurrency, formatDateTime } from "../../../utils/formatters";
import { nowLocalIsoString, type DatePreset, toIsoLocal } from "../../../utils/datePreset";
import { ORDER_STATUS_LABEL } from "../../../constants/statusMaps";
import type { TableColumn } from "../../../types/common.types";
import type { PurchaseOrder } from "../../../types/purchaseOrder.types";
import type { Product } from "../../../types/product.types";
import type { SupplierOption } from "../../../components/SupplierSearchDropdown/SupplierSearchDropdown";

import { PurchaseOrderFilters } from "../../../features/purchaseOrders/components/PurchaseOrderFilters";
import { CreateEditOrderModal, type LineItem } from "../../../features/purchaseOrders/components/CreateEditOrderModal";
import { OrderDetailModal } from "../../../features/purchaseOrders/components/OrderDetailModal";

import styles from "./PurchaseOrder.module.css";

const EMPTY_LINE: LineItem = {
  _key: "", variantId: "", sku: "", productName: "", quantity: 1, unitPrice: 0, lineTotal: 0,
};

export function PurchaseOrderPage() {
  const { showToast } = useToast();

  // Products (flattened variants)
  const [products, setProducts] = useState<Product[]>([]);

  // Orders list
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Sort
  const [sortBy, setSortBy] = useState<"orderDate" | "totalAmount" | "totalQuantity">("orderDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<SupplierOption | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset | "">("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<PurchaseOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [confirmReceive, setConfirmReceive] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  // Form state
  const [formSupplier, setFormSupplier] = useState<SupplierOption | null>(null);
  const [formNote, setFormNote] = useState("");
  const [formLines, setFormLines] = useState<LineItem[]>([{ ...EMPTY_LINE, _key: "1" }]);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Quick-view modals
  const [quickViewSupplierId, setQuickViewSupplierId] = useState<string | null>(null);
  const [quickViewVariantId, setQuickViewVariantId] = useState<string | null>(null);
  const [quickViewUserId, setQuickViewUserId] = useState<string | null>(null);
  const [quickViewUserName, setQuickViewUserName] = useState("");

  // ─── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    getProductsPage(1)
      .then(async (first) => {
        let all = [...first.items];
        for (let p = 2; p <= first.totalPages; p++) {
          const page = await getProductsPage(p);
          all = all.concat(page.items);
        }
        const flattened: Product[] = all
          .filter((p) => !p.status || p.status.toUpperCase() === "ACTIVE")
          .flatMap((p) =>
            (p.variants || [])
              .filter((v) => !v.status || v.status.toUpperCase() === "ACTIVE")
              .map((v) => ({
                id: String(v.id), code: p.code, sku: v.sku, name: p.name,
                category: p.category, categoryLabel: p.categoryLabel,
                importPrice: v.importPrice, salePrice: v.salePrice, unit: p.unit || "Cái",
                stock: v.stock, description: p.description, image: p.image,
                createdAt: p.createdAt, updatedAt: p.updatedAt,
                option1Value: v.option1Value, option2Value: v.option2Value, option3Value: v.option3Value,
                variants: [],
              })),
          );
        setProducts(flattened);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => { setDebouncedQuery(searchQuery); setCurrentPage(1); }, 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getPurchaseOrdersPage(
      currentPage,
      debouncedQuery || undefined,
      statusFilter || undefined,
      sortBy, sortDir,
      dateFrom || undefined,
      dateTo || undefined,
      supplierFilter ? Number(supplierFilter.id) : undefined,
    )
      .then((data) => {
        if (!active) return;
        setOrders(data.items);
        setTotalElements(data.totalElements);
        setPageSize(data.pageSize);
      })
      .catch(() => { if (active) showToast("Không thể tải danh sách đơn đặt hàng!", "error"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentPage, refreshTrigger, debouncedQuery, sortBy, sortDir, showToast, statusFilter, dateFrom, dateTo, supplierFilter]);

  const triggerRefresh = () => setRefreshTrigger((n) => n + 1);

  // ─── Sort ───────────────────────────────────────────────────────────────────
  const handleSort = (field: "orderDate" | "totalAmount" | "totalQuantity") => {
    if (sortBy === field) setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortDir("asc"); }
    setCurrentPage(1);
  };

  const buildSortHeader = (label: string, field: "orderDate" | "totalAmount" | "totalQuantity") => {
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

  // ─── Form helpers ──────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormSupplier(null);
    setFormNote("");
    setFormLines([{ ...EMPTY_LINE, _key: "1" }]);
  };

  const openCreate = () => { resetForm(); setIsCreateOpen(true); };

  const openEdit = (order: PurchaseOrder) => {
    setFormSupplier({ id: order.supplierId, code: "", name: order.supplierName });
    setFormNote(order.note);
    setFormLines(order.details.map((d) => ({
      _key: d.id, variantId: d.variantId, sku: d.sku, productName: d.sku,
      quantity: d.quantity, unitPrice: d.unitPrice, lineTotal: d.lineTotal,
    })));
    setEditingOrder(order);
    setDetailOrder(null);
  };

  const updateLine = (idx: number, field: keyof LineItem, val: string | number) => {
    if (field === "variantId" && val) {
      const isDup = formLines.some((line, i) => i !== idx && line.variantId === String(val));
      if (isDup) { showToast("Sản phẩm này đã có trong danh sách đặt hàng", "warning"); return; }
    }
    setFormLines((prev) =>
      prev.map((line, i) => {
        if (i !== idx) return line;
        if (field === "variantId") {
          const p = products.find((pr) => pr.id === String(val));
          if (!p) return { ...line, variantId: String(val) };
          return { ...line, variantId: p.id, sku: p.sku, productName: p.name, unitPrice: p.importPrice, lineTotal: p.importPrice * line.quantity };
        }
        const updated = { ...line, [field]: val };
        if (field === "quantity" || field === "unitPrice")
          updated.lineTotal = (updated.quantity || 0) * (updated.unitPrice || 0);
        return updated;
      }),
    );
  };

  const addLine = () => setFormLines((prev) => [...prev, { ...EMPTY_LINE, _key: String(Date.now()) }]);
  const removeLine = (idx: number) => setFormLines((prev) => prev.filter((_, i) => i !== idx));

  // ─── API handlers ──────────────────────────────────────────────────────────
  const buildPayload = (): PurchaseOrderCreateRequestDto | null => {
    if (!formSupplier) { showToast("Vui lòng chọn nhà cung cấp", "warning"); return null; }
    const validLines = formLines.filter((l) => l.variantId && l.quantity > 0);
    if (!validLines.length) { showToast("Vui lòng thêm ít nhất một sản phẩm hợp lệ", "warning"); return null; }
    const supplierId = Number(formSupplier.id);
    if (!supplierId || isNaN(supplierId)) { showToast("ID nhà cung cấp không hợp lệ", "error"); return null; }
    return {
      supplierId,
      orderDate: nowLocalIsoString(),
      note: formNote || undefined,
      details: validLines.map((l) => ({ variantId: Number(l.variantId), quantity: l.quantity, unitPrice: l.unitPrice })),
    };
  };

  const handleCreate = async () => {
    const payload = buildPayload();
    if (!payload) return;
    try {
      setFormSubmitting(true);
      await createPurchaseOrder(payload);
      showToast("Tạo đơn đặt hàng thành công!", "success");
      setIsCreateOpen(false); resetForm(); triggerRefresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể tạo đơn đặt hàng", "error");
    } finally { setFormSubmitting(false); }
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    const payload = buildPayload();
    if (!payload) return;
    payload.orderDate = editingOrder.orderDate;
    try {
      setFormSubmitting(true);
      await updatePurchaseOrder(editingOrder.id, payload);
      showToast("Lưu thành công!", "success");
      setEditingOrder(null); resetForm(); triggerRefresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể lưu đơn hàng", "error");
    } finally { setFormSubmitting(false); }
  };

  const handleUpdateStatus = async (id: string, status: PurchaseOrder["status"]) => {
    const labels: Partial<Record<PurchaseOrder["status"], string>> = {
      PENDING: "Đã duyệt đơn hàng!", RECEIVED: "Đã xác nhận nhận hàng!", CANCELLED: "Đã huỷ đơn hàng!",
    };
    try {
      await updatePurchaseOrderStatus(id, status);
      showToast(labels[status] ?? "Đã cập nhật trạng thái!", "success");
      setConfirmReceive(null); setConfirmCancel(null); setDetailOrder(null); triggerRefresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể cập nhật trạng thái", "error");
    }
  };

  // ─── Table columns ─────────────────────────────────────────────────────────
  const columns: TableColumn<PurchaseOrder>[] = [
    { key: "code", label: "Mã đơn", width: "140px" },
    { key: "supplierName", label: "Nhà cung cấp" },
    {
      key: "totalQuantity", label: buildSortHeader("SL Đặt", "totalQuantity"),
      width: "90px", align: "center",
      render: (val) => <span style={{ fontWeight: 600 }}>{val as number}</span>,
    },
    {
      key: "totalAmount", label: buildSortHeader("Tổng tiền", "totalAmount"),
      width: "140px", align: "right",
      render: (val) => <strong style={{ color: "var(--color-primary)" }}>{formatCurrency(val as number)}</strong>,
    },
    {
      key: "status", label: "Trạng thái", width: "120px", align: "center",
      render: (val) => (
        <span className={[styles.badge, styles[val as string]].join(" ")}>
          {ORDER_STATUS_LABEL[val as string] ?? (val as string)}
        </span>
      ),
    },
    {
      key: "orderDate", label: buildSortHeader("Ngày đặt", "orderDate"),
      width: "130px",
      render: (val) => formatDateTime(val as string),
    },
    {
      key: "id", label: "Hành động", width: "100px", align: "center",
      render: (_, row) => (
        <div className={styles.actionBtns}>
          <Button variant="ghost" size="sm" icon="fi fi-rr-eye" onClick={() => setDetailOrder(row)}>Xem</Button>
        </div>
      ),
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <section>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Đơn đặt hàng</h2>
            <p className={styles.subtitle}>{totalElements} đơn</p>
          </div>
          <Button icon="fi fi-rr-add" onClick={openCreate}>Tạo đơn đặt hàng</Button>
        </div>

        <PurchaseOrderFilters
          statusFilter={statusFilter}
          onStatusChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
          supplierFilter={supplierFilter}
          onSupplierChange={(s) => { setSupplierFilter(s); setCurrentPage(1); }}
          datePreset={datePreset}
          customFrom={customFrom}
          customTo={customTo}
          onDatePresetChange={(val, from, to) => {
            setDatePreset(val);
            setDateFrom(from);
            setDateTo(to);
            if (val !== "custom") { setCustomFrom(""); setCustomTo(""); }
            setCurrentPage(1);
          }}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
          onApplyCustomDate={() => {
            if (!customFrom || !customTo) { showToast("Vui lòng chọn đầy đủ ngày", "warning"); return; }
            if (customFrom > customTo) { showToast("Ngày bắt đầu không thể sau ngày kết thúc", "warning"); return; }
            setDateFrom(toIsoLocal(customFrom, false));
            setDateTo(toIsoLocal(customTo, true));
            setCurrentPage(1);
          }}
        />

        <Card>
          <CardHeader
            title="Danh sách đơn đặt hàng"
            actions={
              <SearchBox
                placeholder="Tìm mã đơn..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                onClear={() => { setSearchQuery(""); setCurrentPage(1); }}
              />
            }
          />
          <CardBody className={styles.tableCardBody}>
            <Table columns={columns} data={orders} rowKey="id" loading={loading} emptyText="Chưa có đơn đặt hàng nào" />
            {totalElements > 0 && (
              <div className={styles.paginationWrap}>
                <Pagination pagination={{ page: currentPage, pageSize, total: totalElements }} onPageChange={setCurrentPage} />
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Modals */}
      <CreateEditOrderModal
        isOpen={isCreateOpen}
        title="Tạo đơn đặt hàng mới"
        formSupplier={formSupplier}
        formNote={formNote}
        formLines={formLines}
        formSubmitting={formSubmitting}
        products={products}
        onClose={() => setIsCreateOpen(false)}
        onSupplierChange={setFormSupplier}
        onNoteChange={setFormNote}
        onUpdateLine={updateLine}
        onAddLine={addLine}
        onRemoveLine={removeLine}
        onSave={handleCreate}
      />

      <CreateEditOrderModal
        isOpen={!!editingOrder}
        title={`Sửa đơn đặt hàng – ${editingOrder?.code ?? ""}`}
        formSupplier={formSupplier}
        formNote={formNote}
        formLines={formLines}
        formSubmitting={formSubmitting}
        products={products}
        onClose={() => { setEditingOrder(null); resetForm(); }}
        onSupplierChange={setFormSupplier}
        onNoteChange={setFormNote}
        onUpdateLine={updateLine}
        onAddLine={addLine}
        onRemoveLine={removeLine}
        onSave={handleSaveEdit}
      />

      <OrderDetailModal
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
        onEdit={openEdit}
        onApprove={(id) => handleUpdateStatus(id, "PENDING")}
        onReceive={(id) => { setDetailOrder(null); setConfirmReceive(id); }}
        onCancel={(id) => { setDetailOrder(null); setConfirmCancel(id); }}
        onSupplierClick={setQuickViewSupplierId}
        onVariantClick={setQuickViewVariantId}
        onUserClick={(id, name) => { setQuickViewUserId(id); setQuickViewUserName(name); }}
      />

      <ConfirmDialog isOpen={!!confirmReceive} title="Xác nhận nhập hàng?"
        message="Sau khi nhập, số lượng tồn kho sẽ tự động cập nhật." confirmLabel="Nhập hàng" cancelLabel="Huỷ"
        onConfirm={() => confirmReceive && handleUpdateStatus(confirmReceive, "RECEIVED")}
        onCancel={() => setConfirmReceive(null)} />

      <ConfirmDialog isOpen={!!confirmCancel} title="Huỷ đơn đặt hàng?"
        message="Đơn hàng sẽ bị huỷ và không thể khôi phục. Bạn có chắc chắn?" confirmLabel="Xác nhận huỷ" cancelLabel="Không"
        onConfirm={() => confirmCancel && handleUpdateStatus(confirmCancel, "CANCELLED")}
        onCancel={() => setConfirmCancel(null)} />

      <SupplierDetailModal supplierId={quickViewSupplierId} onClose={() => setQuickViewSupplierId(null)} />
      <VariantDetailModal variantId={quickViewVariantId} onClose={() => setQuickViewVariantId(null)} />
      <UserDetailModal userId={quickViewUserId} userName={quickViewUserName} onClose={() => { setQuickViewUserId(null); setQuickViewUserName(""); }} />
    </section>
  );
}
