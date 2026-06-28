import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "../../../components/Button/Button";
import { Card, CardHeader, CardBody } from "../../../components/Card/Card";
import { Modal } from "../../../components/Modal/Modal";
import { Select } from "../../../components/Select/Select";
import { Input } from "../../../components/Input/Input";
import { ConfirmDialog } from "../../../components/ConfirmDialog/ConfirmDialog";
import { Table } from "../../../components/Table/Table";
import { useToast } from "../../../components/Toast/ToastContext";
import { useWarehouseContext } from "../../../hooks/useWarehouseContext";
import { getSuppliersPage } from "../../../services/supplier";
import { getProductsPage } from "../../../services/product";
import { formatCurrency, formatDate } from "../../../utils/formatters";
import type { TableColumn } from "../../../types/common.types";
import type { PurchaseOrder, ReceiptItem } from "../../../types/payment.types";
import type { Supplier } from "../../../types/supplier.types";
import type { Product } from "../../../types/product.types";
import styles from "./PurchaseOrder.module.css";

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  CANCELLED: "Đã huỷ",
  IMPORTED: "Đã nhập kho",
};

interface SearchableProductDropdownProps {
  value: string;
  onChange: (val: string) => void;
  products: Product[];
  selectedIds: string[];
}

function SearchableProductDropdown({ value, onChange, products, selectedIds }: SearchableProductDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [products, search]);

  const selectedProduct = products.find((p) => p.id === value);

  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      <div className={styles.dropdownTrigger} onClick={() => setIsOpen(!isOpen)}>
        <span>{selectedProduct ? `${selectedProduct.sku} - ${selectedProduct.name}` : "-- Chọn sản phẩm --"}</span>
        <i className={`fi fi-rr-angle-small-${isOpen ? "up" : "down"}`} />
      </div>
      {isOpen && (
        <div className={styles.dropdownMenu}>
          <div className={styles.dropdownSearchWrapper}>
            <i className="fi fi-rr-search" />
            <input
              type="text"
              className={styles.dropdownSearchInput}
              placeholder="Tìm sản phẩm (SKU, tên...)..."
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

type LineItem = ReceiptItem & { productId: string };

const EMPTY_LINE: LineItem = { id: "", productId: "", sku: "", productName: "", quantity: 1, unitPrice: 0, totalPrice: 0 };

export function PurchaseOrderPage() {
  const { purchaseOrders, addPurchaseOrder, updatePurchaseOrderStatus, editPurchaseOrder, importOrder } = useWarehouseContext();
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<PurchaseOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [confirmImport, setConfirmImport] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<string | null>(null);

  // Create/Edit form state
  const [formSupplierId, setFormSupplierId] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formLines, setFormLines] = useState<LineItem[]>([{ ...EMPTY_LINE, id: "1" }]);

  useEffect(() => {
    getSuppliersPage(1).then(async (first) => {
      let all = [...first.items];
      for (let p = 2; p <= first.totalPages; p++) {
        const page = await getSuppliersPage(p);
        all = all.concat(page.items);
      }
      setSuppliers(all.filter((s) => s.status === "active"));
    }).catch(console.error);

    getProductsPage(1).then(async (first) => {
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
              size: v.size,
              color: v.color,
              material: v.material,
              variants: [],
            }))
        );
      setProducts(flattened);
    }).catch(console.error);
  }, []);

  const supplierOptions = useMemo(() =>
    suppliers.map((s) => ({ value: s.id && s.id !== "undefined" ? s.id : s.code, label: s.companyName })),
    [suppliers]
  );

  // ---- Line helpers ----
  const updateLine = (idx: number, field: keyof LineItem, val: string | number) => {
    if (field === "productId" && val) {
      const isDuplicate = formLines.some((line, i) => i !== idx && line.productId === String(val));
      if (isDuplicate) {
        showToast("Sản phẩm này đã có trong danh sách đặt hàng", "warning");
        return;
      }
    }

    setFormLines((prev) => prev.map((line, i) => {
      if (i !== idx) return line;
      if (field === "productId") {
        const p = products.find((pr) => pr.id === String(val));
        if (!p) return { ...line, productId: String(val) };
        return { ...line, productId: p.id, sku: p.sku, productName: p.name, unitPrice: p.importPrice, totalPrice: p.importPrice * line.quantity };
      }
      const updated = { ...line, [field]: val };
      if (field === "quantity" || field === "unitPrice") {
        updated.totalPrice = (updated.quantity || 0) * (updated.unitPrice || 0);
      }
      return updated;
    }));
  };

  const addLine = () => setFormLines((prev) => [...prev, { ...EMPTY_LINE, id: String(Date.now()) }]);
  const removeLine = (idx: number) => setFormLines((prev) => prev.filter((_, i) => i !== idx));

  const totalQty = useMemo(() => formLines.reduce((s, l) => s + (l.quantity || 0), 0), [formLines]);
  const totalAmount = useMemo(() => formLines.reduce((s, l) => s + (l.totalPrice || 0), 0), [formLines]);

  const resetForm = () => {
    setFormSupplierId("");
    setFormNote("");
    setFormLines([{ ...EMPTY_LINE, id: "1" }]);
  };

  const openCreate = () => { resetForm(); setIsCreateOpen(true); };

  const openEdit = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setFormSupplierId(order.supplierId);
    setFormNote(order.note);
    setFormLines(order.items.map((item) => ({ ...item, productId: item.productId || "" })));
  };

  const handleCreate = () => {
    if (!formSupplierId) { showToast("Vui lòng chọn nhà cung cấp", "warning"); return; }
    const validLines = formLines.filter((l) => l.productId && l.quantity > 0);
    if (validLines.length === 0) { showToast("Vui lòng thêm ít nhất một sản phẩm", "warning"); return; }
    const supplierName = suppliers.find((s) => s.id === formSupplierId || s.code === formSupplierId)?.companyName ?? "";
    addPurchaseOrder({
      supplierId: formSupplierId,
      supplierName,
      items: validLines,
      totalQuantity: totalQty,
      totalAmount,
      note: formNote,
    });
    showToast("Tạo đơn đặt hàng thành công!", "success");
    setIsCreateOpen(false);
    resetForm();
  };

  const handleSaveEdit = () => {
    if (!editingOrder) return;
    if (!formSupplierId) { showToast("Vui lòng chọn nhà cung cấp", "warning"); return; }
    const validLines = formLines.filter((l) => l.productId && l.quantity > 0);
    if (validLines.length === 0) { showToast("Vui lòng thêm ít nhất một sản phẩm", "warning"); return; }
    const supplierName = suppliers.find((s) => s.id === formSupplierId || s.code === formSupplierId)?.companyName ?? "";
    editPurchaseOrder(editingOrder.id, {
      supplierId: formSupplierId,
      supplierName,
      items: validLines,
      totalQuantity: totalQty,
      totalAmount,
      note: formNote,
    });
    showToast("Đã cập nhật đơn đặt hàng!", "success");
    setEditingOrder(null);
    resetForm();
  };

  const handleApprove = (id: string) => {
    updatePurchaseOrderStatus(id, "APPROVED");
    showToast("Đã duyệt đơn đặt hàng!", "success");
    setConfirmApprove(null);
  };

  const handleCancel = (id: string) => {
    updatePurchaseOrderStatus(id, "CANCELLED");
    showToast("Đã huỷ đơn đặt hàng!", "success");
    setConfirmCancel(null);
  };

  const handleImport = (id: string) => {
    importOrder(id);
    showToast("Nhập kho thành công! Phiếu nhập kho đã được tạo.", "success");
    setConfirmImport(null);
    setDetailOrder(null);
  };

  // Render form (create / edit)
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
          <Button variant="ghost" size="sm" icon="fi fi-rr-add" onClick={addLine}>Thêm dòng</Button>
        </div>
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th style={{ width: 80 }}>SL</th>
              <th style={{ width: 120 }}>Đơn giá</th>
              <th style={{ width: 120 }}>Thành tiền</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {formLines.map((line, idx) => (
              <tr key={line.id}>
                <td>
                  <SearchableProductDropdown
                    value={line.productId}
                    onChange={(val) => updateLine(idx, "productId", val)}
                    products={products}
                    selectedIds={formLines.filter((_, i) => i !== idx).map((l) => l.productId).filter(Boolean)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    className={styles.lineInput}
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, "quantity", Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className={styles.lineInput}
                    value={line.unitPrice ? new Intl.NumberFormat("vi-VN").format(line.unitPrice) : ""}
                    readOnly
                    style={{ backgroundColor: "var(--color-bg)", color: "var(--color-subtext)", cursor: "not-allowed" }}
                  />
                </td>
                <td style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                  {line.totalPrice ? formatCurrency(line.totalPrice) : "—"}
                </td>
                <td>
                  {formLines.length > 1 && (
                    <button className={styles.removeItemBtn} onClick={() => removeLine(idx)}>
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

  // Render detail view
  const renderDetail = (order: PurchaseOrder) => (
    <div className={styles.detailSection}>
      <div className={styles.detailHeader}>
        <div>
          <div className={styles.detailCode}>{order.code}</div>
          <div className={styles.detailSupplier}>{order.supplierName}</div>
        </div>
        <span className={[styles.badge, styles[order.status]].join(" ")}>
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>

      <div className={styles.detailMeta}>
        <span>Ngày tạo: {formatDate(order.createdAt)}</span>
        {order.approvedAt && <span>Ngày duyệt: {formatDate(order.approvedAt)}</span>}
        {order.note && <span>Ghi chú: {order.note}</span>}
      </div>

      <table className={styles.readonlyTable}>
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th>SKU</th>
            <th style={{ width: 80, textAlign: "right" }}>SL</th>
            <th style={{ width: 130, textAlign: "right" }}>Đơn giá</th>
            <th style={{ width: 130, textAlign: "right" }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>{item.productName}</td>
              <td style={{ color: "var(--color-subtext)", fontSize: "0.8rem" }}>{item.sku}</td>
              <td style={{ textAlign: "right" }}>{item.quantity}</td>
              <td style={{ textAlign: "right" }}>{formatCurrency(item.unitPrice)}</td>
              <td style={{ textAlign: "right" }} className={styles.amountCell}>{formatCurrency(item.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.detailTotal}>
        <span>Tổng tiền:</span>
        <span className={styles.detailTotalAmount}>{formatCurrency(order.totalAmount)}</span>
      </div>

      <div className={styles.modalFooter}>
        <Button variant="secondary" onClick={() => setDetailOrder(null)}>Đóng</Button>
        {order.status === "PENDING" && (
          <>
            <Button variant="secondary" icon="fi fi-rr-edit" onClick={() => { setDetailOrder(null); openEdit(order); }}>Chỉnh sửa</Button>
            <Button variant="danger" icon="fi fi-rr-cross-circle" onClick={() => { setDetailOrder(null); setConfirmCancel(order.id); }}>Huỷ đơn</Button>
            <Button icon="fi fi-rr-check" onClick={() => { setDetailOrder(null); setConfirmApprove(order.id); }}>Duyệt đơn</Button>
          </>
        )}
        {order.status === "APPROVED" && (
          <>
            <Button variant="secondary" icon="fi fi-rr-edit" onClick={() => { setDetailOrder(null); openEdit(order); }}>Chỉnh sửa</Button>
            <Button variant="danger" icon="fi fi-rr-cross-circle" onClick={() => { setDetailOrder(null); setConfirmCancel(order.id); }}>Huỷ đơn</Button>
            <Button icon="fi fi-rr-boxes" onClick={() => { setDetailOrder(null); setConfirmImport(order.id); }}>Nhập kho</Button>
          </>
        )}
      </div>
    </div>
  );

  const columns: TableColumn<PurchaseOrder>[] = [
    { key: "code", label: "Mã đơn", width: "150px" },
    { key: "supplierName", label: "Nhà cung cấp" },
    {
      key: "totalQuantity",
      label: "Tổng SL",
      width: "90px",
      align: "center",
      render: (val) => <strong>{val as number}</strong>,
    },
    {
      key: "totalAmount",
      label: "Tổng tiền",
      width: "140px",
      align: "right",
      render: (val) => <strong style={{ color: "var(--color-primary)" }}>{formatCurrency(val as number)}</strong>,
    },
    {
      key: "status",
      label: "Trạng thái",
      width: "140px",
      align: "center",
      render: (val) => (
        <span className={[styles.badge, styles[val as string]].join(" ")}>
          {ORDER_STATUS_LABEL[val as string]}
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
      width: "260px",
      align: "center",
      render: (_, row) => (
        <div className={styles.actionBtns} style={{ justifyContent: "center" }}>
          <Button variant="ghost" size="sm" icon="fi fi-rr-eye" onClick={() => setDetailOrder(row)}>Xem</Button>
          {row.status === "PENDING" && (
            <>
              <Button variant="ghost" size="sm" icon="fi fi-rr-check" onClick={() => setConfirmApprove(row.id)}>Duyệt</Button>
              <Button variant="danger" size="sm" icon="fi fi-rr-cross-circle" onClick={() => setConfirmCancel(row.id)}>Huỷ</Button>
            </>
          )}
          {row.status === "APPROVED" && (
            <Button size="sm" icon="fi fi-rr-boxes" onClick={() => setConfirmImport(row.id)}>Nhập kho</Button>
          )}
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
            <p className={styles.subtitle}>{purchaseOrders.length} đơn</p>
          </div>
          <Button icon="fi fi-rr-add" onClick={openCreate}>Tạo đơn đặt hàng</Button>
        </div>

        <Card>
          <CardHeader title="Danh sách đơn đặt hàng" />
          <CardBody className={styles.tableCardBody}>
            <Table columns={columns} data={purchaseOrders} rowKey="id" emptyText="Chưa có đơn đặt hàng nào" />
          </CardBody>
        </Card>
      </div>

      {/* Create modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Tạo đơn đặt hàng mới" size="xxl">
        {renderForm()}
        <div className={styles.modalFooter}>
          <div className={styles.footerSummary}>
            Tổng số lượng: <strong style={{ color: "var(--color-text)" }}>{totalQty}</strong>
            <span style={{ margin: "0 12px", color: "var(--color-border)" }}>|</span>
            Tổng tiền: <strong className={styles.footerTotalAmount}>{formatCurrency(totalAmount)}</strong>
          </div>
          <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>Huỷ</Button>
          <Button icon="fi fi-rr-check" onClick={handleCreate}>Tạo đơn</Button>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editingOrder} onClose={() => { setEditingOrder(null); resetForm(); }} title={`Chỉnh sửa đơn ${editingOrder?.code ?? ""}`} size="xxl">
        {renderForm()}
        <div className={styles.modalFooter}>
          <div className={styles.footerSummary}>
            Tổng số lượng: <strong style={{ color: "var(--color-text)" }}>{totalQty}</strong>
            <span style={{ margin: "0 12px", color: "var(--color-border)" }}>|</span>
            Tổng tiền: <strong className={styles.footerTotalAmount}>{formatCurrency(totalAmount)}</strong>
          </div>
          <Button variant="secondary" onClick={() => { setEditingOrder(null); resetForm(); }}>Huỷ</Button>
          <Button icon="fi fi-rr-check" onClick={handleSaveEdit}>Lưu thay đổi</Button>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal isOpen={!!detailOrder} onClose={() => setDetailOrder(null)} title={`Chi tiết đơn đặt hàng`} size="lg">
        {detailOrder && renderDetail(detailOrder)}
      </Modal>

      {/* Confirm approve */}
      <ConfirmDialog
        isOpen={!!confirmApprove}
        title="Duyệt đơn đặt hàng?"
        message="Sau khi duyệt, đơn hàng sẽ chuyển sang trạng thái Đã duyệt và sẵn sàng để nhập hàng."
        confirmLabel="Duyệt đơn"
        cancelLabel="Huỷ"
        onConfirm={() => confirmApprove && handleApprove(confirmApprove)}
        onCancel={() => setConfirmApprove(null)}
      />

      {/* Confirm cancel */}
      <ConfirmDialog
        isOpen={!!confirmCancel}
        title="Huỷ đơn đặt hàng?"
        message="Đơn hàng sẽ bị huỷ và không thể khôi phục. Bạn có chắc chắn?"
        confirmLabel="Xác nhận huỷ"
        cancelLabel="Không"
        onConfirm={() => confirmCancel && handleCancel(confirmCancel)}
        onCancel={() => setConfirmCancel(null)}
      />

      {/* Confirm import */}
      <ConfirmDialog
        isOpen={!!confirmImport}
        title="Xác nhận nhập kho?"
        message="Sau khi nhập kho, đơn này sẽ không thể chỉnh sửa. Một phiếu nhập kho sẽ được tự động tạo ra."
        confirmLabel="Nhập kho"
        cancelLabel="Huỷ"
        onConfirm={() => confirmImport && handleImport(confirmImport)}
        onCancel={() => setConfirmImport(null)}
      />
    </section>
  );
}
