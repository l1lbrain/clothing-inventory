import { useState, useEffect, useMemo } from "react";
import type { Product, Variant } from "../../../types/product.types";
import {
  getProductsPage, deleteProduct, deleteVariant, deleteVariants,
  bulkUpdateVariantPrices, updateProduct, mapBackendProductToFrontend,
  type ProductUpdatePayload, updateVariant, type VariantUpdatePayload,
  getCategories, type CategoryResponseDto,
} from "../../../services/product";
import { getTransactionsByVariantId, type InventoryTransactionDto } from "../../../services/inventoryTransaction";
import type { PurchaseOrder } from "../../../types/purchaseOrder.types";
import { Card, CardHeader, CardBody } from "../../../components/Card/Card";
import { Pagination } from "../../../components/Pagination/Pagination";
import { Modal } from "../../../components/Modal/Modal";
import { Button } from "../../../components/Button/Button";
import { ConfirmDialog } from "../../../components/ConfirmDialog/ConfirmDialog";
import { UserDetailModal } from "../../../components/UserDetailModal/UserDetailModal";
import { useToast } from "../../../components/Toast/ToastContext";
import { validate, isRequired, isPositiveNumber } from "../../../utils/validators";
import { formatCurrency, formatDateTime } from "../../../utils/formatters";

// Feature components
import { ProductFilters } from "../../../features/products/components/ProductFilters";
import { ProductTable } from "../../../features/products/components/ProductTable";
import { EditProductModal } from "../../../features/products/components/EditProductModal";
import { EditVariantModal } from "../../../features/products/components/EditVariantModal";
import { BulkEditVariantModal } from "../../../features/products/components/BulkEditVariantModal";
import type { ProductAttribute } from "../../../components/ProductAttributeEditor/ProductAttributeEditor";

import styles from "./ProductList.module.css";

type ProductForm = {
  code: string; sku: string; name: string; category: string;
  unit: string; importPrice: string; salePrice: string;
  description: string; brand: string; status: string;
};
type VariantFormType = {
  sku: string; importPrice: string; salePrice: string;
  option1Value: string; option2Value: string; option3Value: string;
  stock: string; note: string; adjustReason: string; status: string;
};

// Trang quản lý danh sách sản phẩm
export function ProductList() {
  // ─── State ────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [sortBy] = useState<"name" | "brand" | "createdAt" | "updatedAt">("createdAt");
  const [sortDir] = useState<"asc" | "desc">("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Product modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);

  // Product edit form
  const [form, setForm] = useState<ProductForm>({ code: "", sku: "", name: "", category: "", unit: "Cái", importPrice: "", salePrice: "", description: "", brand: "", status: "ACTIVE" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [tagInputs, setTagInputs] = useState<string[]>(["", "", ""]);
  const [variantPriceOverrides, setVariantPriceOverrides] = useState<Record<string, { importPrice: string; salePrice: string }>>({});
  const [removedVariantLabels, setRemovedVariantLabels] = useState<Set<string>>(new Set());
  const [editingVariantLabel, setEditingVariantLabel] = useState<string | null>(null);
  const [editingPrices, setEditingPrices] = useState({ importPrice: "", salePrice: "" });

  // Variant modals
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [isVariantEditOpen, setIsVariantEditOpen] = useState(false);
  const [deleteVariantId, setDeleteVariantId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState<VariantFormType>({ sku: "", importPrice: "", salePrice: "", option1Value: "", option2Value: "", option3Value: "", stock: "", note: "", adjustReason: "", status: "ACTIVE" });
  const [variantErrors, setVariantErrors] = useState<Record<string, string>>({});
  const [activeVariantTab, setActiveVariantTab] = useState<"info" | "history">("info");

  // Bulk ops
  const [checkedVariantIds, setCheckedVariantIds] = useState<Set<string>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({ importPrice: "", salePrice: "", status: "" });
  const [bulkErrors, setBulkErrors] = useState<Record<string, string>>({});

  // Transaction history
  const [txHistory, setTxHistory] = useState<InventoryTransactionDto[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txTotalElements, setTxTotalElements] = useState(0);
  const [txPageSize, setTxPageSize] = useState(10);
  const [txLoading, setTxLoading] = useState(false);

  // PO detail
  const [poDetail, setPoDetail] = useState<PurchaseOrder | null>(null);
  const [poDetailLoading, setPoDetailLoading] = useState(false);

  // User detail modal
  const [quickViewUserId, setQuickViewUserId] = useState<string | null>(null);
  const [quickViewUserName, setQuickViewUserName] = useState("");

  const { showToast } = useToast();

  // ─── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => { setDebouncedQuery(searchQuery); setCurrentPage(1); }, 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getProductsPage(currentPage, debouncedQuery.trim() || undefined, statusFilter || undefined, sortBy, sortDir)
      .then((data) => {
        if (!active) return;
        setProducts(data.items);
        setTotalElements(data.totalElements);
        setPageSize(data.pageSize);
      })
      .catch(() => { if (active) showToast("Không thể tải danh sách sản phẩm!", "error"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentPage, refreshTrigger, debouncedQuery, sortBy, sortDir, statusFilter, showToast]);

  // ─── Computed ─────────────────────────────────────────────────────────────
  const displayProducts = useMemo(
    () => categoryFilter ? products.filter((p) => p.categoryLabel.toLowerCase() === categoryFilter.toLowerCase()) : products,
    [products, categoryFilter],
  );

  const triggerRefresh = () => setRefreshTrigger((n) => n + 1);

  // ─── Handlers: Product ────────────────────────────────────────────────────
  const openDetail = (product: Product) => { setSelectedProduct(product); setCheckedVariantIds(new Set()); };

  const handleEdit = (product: Product) => {
    const matchedCat = categories.find((c) => c.name.toLowerCase() === product.categoryLabel.toLowerCase());
    setForm({ code: product.code, sku: product.sku, name: product.name, category: matchedCat ? String(matchedCat.id) : "", unit: product.unit || "Cái", importPrice: String(product.importPrice), salePrice: String(product.salePrice), description: product.description || "", brand: product.brand || "", status: product.status || "ACTIVE" });
    setErrors({});
    const attrs: ProductAttribute[] = [];
    if (product.option1Name) { const vals = [...new Set(product.variants.map((v) => v.option1Value).filter(Boolean))] as string[]; if (vals.length) attrs.push({ name: product.option1Name, values: vals }); }
    if (product.option2Name) { const vals = [...new Set(product.variants.map((v) => v.option2Value).filter(Boolean))] as string[]; if (vals.length) attrs.push({ name: product.option2Name, values: vals }); }
    if (product.option3Name) { const vals = [...new Set(product.variants.map((v) => v.option3Value).filter(Boolean))] as string[]; if (vals.length) attrs.push({ name: product.option3Name, values: vals }); }
    setAttributes(attrs);
    setTagInputs(["", "", ""]);
    const overrides: Record<string, { importPrice: string; salePrice: string }> = {};
    product.variants.forEach((v) => {
      const vals: string[] = [];
      if (attrs.length >= 1 && v.option1Value) vals.push(v.option1Value);
      if (attrs.length >= 2 && v.option2Value) vals.push(v.option2Value);
      if (attrs.length >= 3 && v.option3Value) vals.push(v.option3Value);
      if (vals.length) overrides[vals.join(" / ")] = { importPrice: String(v.importPrice), salePrice: String(v.salePrice) };
    });
    setVariantPriceOverrides(overrides);
    setRemovedVariantLabels(new Set());
    setEditingVariantLabel(null);
    setSelectedProduct(product);
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    const errs = validate(form, { name: [isRequired], category: [isRequired], unit: [isRequired] });
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!selectedProduct) return;

    // Build variants list from visible preview variants
    const previewVariants = (() => {
      const activeAttrs = attributes.filter((a) => a.name.trim() && a.values.length > 0);
      if (!activeAttrs.length) return [];
      const cartesian = (arrays: string[][]): string[][] => arrays.reduce<string[][]>((acc, arr) => acc.flatMap((prev) => arr.map((val) => [...prev, val])), [[]]);
      return cartesian(activeAttrs.map((a) => a.values)).map((vals) => ({ label: vals.join(" / "), values: vals })).filter((v) => !removedVariantLabels.has(v.label));
    })();

    let newVariants: ReturnType<typeof mapBackendProductToFrontend>["variants"];
    if (attributes.length === 0) {
      const ex = selectedProduct.variants[0];
      const imp = Number(String(form.importPrice || 0).replace(/\./g, ""));
      const sal = Number(String(form.salePrice || 0).replace(/\./g, ""));
      newVariants = [{ id: ex?.id || "temp-0", sku: ex?.sku || form.code || "", importPrice: imp, salePrice: sal, stock: ex?.stock || 0, note: ex?.note || "", status: form.status }];
    } else {
      newVariants = previewVariants.map((vv, idx) => {
        const [opt1Val = "", opt2Val = "", opt3Val = ""] = vv.values;
        const existing = selectedProduct.variants.find((v) => (opt1Val ? v.option1Value === opt1Val : !v.option1Value) && (opt2Val ? v.option2Value === opt2Val : !v.option2Value) && (opt3Val ? v.option3Value === opt3Val : !v.option3Value));
        const ov = variantPriceOverrides[vv.label];
        const imp = ov?.importPrice ? Number(ov.importPrice.replace(/\./g, "")) : Number(form.importPrice || 0);
        const sal = ov?.salePrice ? Number(ov.salePrice.replace(/\./g, "")) : Number(form.salePrice || 0);
        return { id: existing?.id || `temp-${idx}`, sku: existing?.sku || `${form.code}-${idx + 1}`, importPrice: imp, salePrice: sal, stock: existing?.stock || 0, option1Value: opt1Val || undefined, option2Value: opt2Val || undefined, option3Value: opt3Val || undefined, note: existing?.note || "", status: form.status };
      });
    }

    const payload: ProductUpdatePayload = {
      name: form.name, categoryId: Number(form.category), brand: form.brand || "", unit: form.unit,
      description: form.description || "", status: form.status,
      option1Name: attributes[0]?.name || null, option2Name: attributes[1]?.name || null, option3Name: attributes[2]?.name || null,
      variants: newVariants.map((v) => {
        const idNum = Number(v.id);
        return { id: isNaN(idNum) || idNum > 1e13 ? null : idNum, sku: v.sku || null, option1Value: (v as Variant).option1Value || null, option2Value: (v as Variant).option2Value || null, option3Value: (v as Variant).option3Value || null, purchasePrice: v.importPrice, salePrice: v.salePrice, status: v.status || "ACTIVE" };
      }),
    };

    try {
      const responseData = await updateProduct(selectedProduct.id, payload);
      const updated = mapBackendProductToFrontend(responseData);
      setProducts((prev) => prev.map((p) => (p.id === selectedProduct.id ? updated : p)));
      showToast("Cập nhật sản phẩm thành công!", "success");
      setIsEditOpen(false); setSelectedProduct(null); setErrors({});
      triggerRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "Cannot update variant with existing transactions") showToast("Không được phép sửa giá trị thuộc tính của phiên bản đã có giao dịch", "error");
      else if (msg === "Cannot delete variant with existing transactions") showToast("Không được phép thay đổi số lượng thuộc tính do đã tồn tại giao dịch", "error");
      else showToast("Cập nhật sản phẩm thất bại", "error");
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductId) return;
    const target = products.find((p) => p.id === deleteProductId);
    if (target?.variants.some((v) => v.hasTransactions)) { showToast("Không thể xóa vì đã tồn tại hóa đơn nhập hàng!", "warning"); setDeleteProductId(null); return; }
    try { await deleteProduct(deleteProductId); showToast("Đã xóa sản phẩm", "success"); if (selectedProduct?.id === deleteProductId) setSelectedProduct(null); triggerRefresh(); }
    catch { showToast("Xóa sản phẩm thất bại", "error"); }
    finally { setDeleteProductId(null); }
  };

  // ─── Handlers: Variant ────────────────────────────────────────────────────
  const handleVariantEdit = (variant: Variant) => {
    setVariantForm({ sku: variant.sku, importPrice: String(variant.importPrice), salePrice: String(variant.salePrice), option1Value: variant.option1Value || "", option2Value: variant.option2Value || "", option3Value: variant.option3Value || "", stock: String(variant.stock), note: variant.note || "", adjustReason: "", status: variant.status?.toUpperCase() === "ACTIVE" ? "ACTIVE" : "INACTIVE" });
    setVariantErrors({}); setSelectedVariant(variant); setIsVariantEditOpen(true);
  };

  const handleVariantSave = async () => {
    const errs = validate(variantForm, { importPrice: [(v) => isPositiveNumber(v)], salePrice: [(v) => isPositiveNumber(v)] });
    const stockChanged = selectedVariant && Number(variantForm.stock) !== selectedVariant.stock;
    if (stockChanged && !variantForm.adjustReason.trim()) errs.adjustReason = "Vui lòng nhập lý do thay đổi số lượng";
    if (Object.keys(errs).length) { setVariantErrors(errs); return; }
    if (!selectedProduct || !selectedVariant) return;
    const isDuplicate = selectedProduct.variants.some((v) => v.id !== selectedVariant.id && (v.option1Value || "").trim().toLowerCase() === (variantForm.option1Value || "").trim().toLowerCase() && (v.option2Value || "").trim().toLowerCase() === (variantForm.option2Value || "").trim().toLowerCase() && (v.option3Value || "").trim().toLowerCase() === (variantForm.option3Value || "").trim().toLowerCase());
    if (isDuplicate) { showToast("Không thể lưu vì phiên bản với các thuộc tính này đã tồn tại!", "error"); return; }
    const payload: VariantUpdatePayload = { option1Value: variantForm.option1Value || null, option2Value: variantForm.option2Value || null, option3Value: variantForm.option3Value || null, purchasePrice: Number(variantForm.importPrice), salePrice: Number(variantForm.salePrice), status: variantForm.status, quantityOnHand: Number(variantForm.stock), adjustReason: stockChanged ? variantForm.adjustReason.trim() : null };
    try {
      const updated = await updateVariant(selectedVariant.id, payload);
      const mapped = mapBackendProductToFrontend(updated);
      setProducts((prev) => prev.map((p) => (p.id === selectedProduct.id ? mapped : p)));
      setSelectedProduct(mapped);
      showToast("Cập nhật phiên bản thành công!", "success");
      closeVariantModals(); triggerRefresh();
    } catch (err) {
      if (err instanceof Error && err.message === "Cannot update variant with existing transactions") showToast("Không được phép sửa giá trị thuộc tính của phiên bản đã có giao dịch", "error");
      else showToast("Cập nhật phiên bản thất bại!", "error");
    }
  };

  const closeVariantModals = () => {
    setIsVariantEditOpen(false); setSelectedVariant(null); setVariantErrors({});
    setActiveVariantTab("info"); setTxHistory([]); setTxPage(1); setTxTotalElements(0);
  };

  const handleDeleteVariant = async () => {
    if (!deleteVariantId) return;
    try { await deleteVariant(deleteVariantId); setSelectedProduct((prev) => prev ? { ...prev, variants: prev.variants.filter((v) => v.id !== deleteVariantId) } : null); showToast("Xóa biến thể thành công!", "success"); triggerRefresh(); }
    catch { showToast("Xóa phiên bản thất bại", "error"); }
    finally { setDeleteVariantId(null); }
  };

  const handleBulkDelete = async () => {
    try { await deleteVariants([...checkedVariantIds]); setSelectedProduct((prev) => prev ? { ...prev, variants: prev.variants.filter((v) => !checkedVariantIds.has(v.id)) } : null); showToast(`Đã xóa thành công ${checkedVariantIds.size} phiên bản!`, "success"); setCheckedVariantIds(new Set()); triggerRefresh(); }
    catch { showToast("Xóa phiên bản thất bại", "error"); }
    finally { setIsBulkDeleteConfirmOpen(false); }
  };

  const handleBulkSave = async () => {
    const errs: Record<string, string> = {};
    if (!bulkForm.importPrice && !bulkForm.salePrice && !bulkForm.status) errs.importPrice = "Vui lòng nhập giá hoặc chọn trạng thái để cập nhật";
    if (bulkForm.importPrice && isNaN(Number(bulkForm.importPrice.replace(/\./g, "")))) errs.importPrice = "Giá nhập không hợp lệ";
    if (bulkForm.salePrice && isNaN(Number(bulkForm.salePrice.replace(/\./g, "")))) errs.salePrice = "Giá bán không hợp lệ";
    if (Object.keys(errs).length) { setBulkErrors(errs); return; }
    if (!selectedProduct) return;
    const newImport = bulkForm.importPrice ? Number(bulkForm.importPrice.replace(/\./g, "")) : null;
    const newSale = bulkForm.salePrice ? Number(bulkForm.salePrice.replace(/\./g, "")) : null;
    try {
      await bulkUpdateVariantPrices({ variantIds: [...checkedVariantIds].map(Number), purchasePrice: newImport, salePrice: newSale, status: bulkForm.status ? bulkForm.status.toUpperCase() : null });
      setProducts((prev) => prev.map((p) => {
        if (p.id !== selectedProduct.id) return p;
        const updatedVariants = p.variants.map((v) => !checkedVariantIds.has(v.id) ? v : { ...v, ...(newImport !== null ? { importPrice: newImport } : {}), ...(newSale !== null ? { salePrice: newSale } : {}), ...(bulkForm.status ? { status: bulkForm.status } : {}) });
        const importPrices = updatedVariants.map((v) => v.importPrice);
        const salePrices = updatedVariants.map((v) => v.salePrice);
        const hasActive = updatedVariants.some((v) => v.status === "ACTIVE" || !v.status);
        const updated = { ...p, importPrice: importPrices.length ? Math.min(...importPrices) : 0, salePrice: salePrices.length ? Math.min(...salePrices) : 0, variants: updatedVariants, status: hasActive ? "ACTIVE" : "INACTIVE" };
        setSelectedProduct(updated); return updated;
      }));
      showToast(`Đã cập nhật ${checkedVariantIds.size} phiên bản!`, "success");
      setIsBulkEditOpen(false); setCheckedVariantIds(new Set());
    } catch { showToast("Cập nhật giá hàng loạt thất bại", "error"); }
  };

  const fetchTxHistory = async (variantId: string, page: number) => {
    try {
      setTxLoading(true);
      const result = await getTransactionsByVariantId(variantId, page);
      setTxHistory(result.items); setTxTotalElements(result.totalElements); setTxPageSize(result.pageSize);
    } catch { showToast("Không thể tải lịch sử giao dịch!", "error"); }
    finally { setTxLoading(false); }
  };

  const handlePOLinkClick = async (poCode: string) => {
    try {
      setPoDetailLoading(true);
      const { getPurchaseOrdersPage } = await import("../../../services/purchaseOrder");
      const result = await getPurchaseOrdersPage(1, poCode);
      const found = result.items.find((o) => o.code === poCode);
      if (found) setPoDetail(found); else showToast("Không tìm thấy đơn đặt hàng này!", "warning");
    } catch { showToast("Không thể tải chi tiết đơn đặt hàng!", "error"); }
    finally { setPoDetailLoading(false); }
  };

  const isFormUnchanged = () => {
    if (!selectedProduct) return true;
    return (
      form.name === selectedProduct.name &&
      form.unit === (selectedProduct.unit || "Cái") &&
      form.description === (selectedProduct.description || "") &&
      form.brand === (selectedProduct.brand || "") &&
      form.status === (selectedProduct.status || "ACTIVE")
    );
  };

  // Variant detail open state (show detail modal when variant selected but not in edit mode)
  const isVariantDetailOpen = !!selectedVariant && !isVariantEditOpen;

  return (
    <section>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Danh sách sản phẩm</h2>
            <p className={styles.subtitle}>{displayProducts.length} sản phẩm</p>
          </div>
        </div>

        <ProductFilters
          searchQuery={searchQuery}
          onSearchChange={(v) => setSearchQuery(v)}
          onSearchClear={() => { setSearchQuery(""); setCurrentPage(1); }}
          categoryFilter={categoryFilter}
          onCategoryChange={(v) => setCategoryFilter(v)}
          statusFilter={statusFilter}
          onStatusChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
          categories={categories}
        />

        <Card>
          <CardHeader
            title="Tất cả sản phẩm"
          />
          <CardBody className={styles.tableBody}>
            <ProductTable
              products={displayProducts}
              loading={loading}
              onView={openDetail}
              onDelete={(id) => setDeleteProductId(id)}
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

      {/* Product detail modal */}
      <Modal isOpen={!!selectedProduct && !isEditOpen} onClose={() => setSelectedProduct(null)} title="Chi tiết sản phẩm" size="xl">
        {selectedProduct && (
          <>
            <div className={styles.detail}>
              {Object.entries({
                "Mã sản phẩm": selectedProduct.code,
                "Tên sản phẩm": selectedProduct.name,
                "Danh mục": selectedProduct.categoryLabel,
                "Thương hiệu": selectedProduct.brand || "—",
                "Đơn vị tính": selectedProduct.unit,
                "Tổng tồn kho": selectedProduct.stock,
                "Ngày tạo": formatDateTime(selectedProduct.createdAt),
                "Mô tả": selectedProduct.description || "—",
              }).map(([k, v]) => (
                <div key={k} className={[styles.detailRow, k === "Mô tả" ? styles.detailRowFullWidth : ""].join(" ")}>
                  <span className={styles.detailKey}>{k}</span>
                  <span className={styles.detailVal}>{v}</span>
                </div>
              ))}
            </div>

            {selectedProduct.variants?.length > 0 && (
              <div className={styles.variantsSection}>
                <div className={styles.variantsTitleRow}>
                  <h4 className={styles.variantsTitle}>Danh sách phiên bản ({selectedProduct.variants.length})</h4>
                  <div className={[styles.bulkToolbar, checkedVariantIds.size > 0 ? styles.bulkToolbarVisible : ""].join(" ")}>
                    <span className={styles.bulkCount}>{checkedVariantIds.size} đã chọn</span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Button size="sm" icon="fi fi-rr-edit" onClick={() => { setBulkForm({ importPrice: "", salePrice: "", status: "" }); setBulkErrors({}); setIsBulkEditOpen(true); }}>Chỉnh sửa hàng loạt</Button>
                      <Button size="sm" variant="danger" icon="fi fi-rr-trash" onClick={() => setIsBulkDeleteConfirmOpen(true)}>Xóa hàng loạt</Button>
                    </div>
                  </div>
                </div>
                <div className={styles.variantsTableWrapper}>
                  <table className={styles.variantsTable}>
                    <thead>
                      <tr>
                        <th style={{ width: "40px", textAlign: "center" }}>
                          <input type="checkbox" className={styles.variantCheckbox}
                            checked={checkedVariantIds.size === selectedProduct.variants.length && selectedProduct.variants.length > 0}
                            ref={(el) => { if (el) el.indeterminate = checkedVariantIds.size > 0 && checkedVariantIds.size < selectedProduct.variants.length; }}
                            onChange={() => {
                              if (checkedVariantIds.size === selectedProduct.variants.length) setCheckedVariantIds(new Set());
                              else setCheckedVariantIds(new Set(selectedProduct.variants.map((v) => v.id)));
                            }}
                          />
                        </th>
                        <th>Mã SKU</th>
                        {selectedProduct.option1Name && <th>{selectedProduct.option1Name}</th>}
                        {selectedProduct.option2Name && <th>{selectedProduct.option2Name}</th>}
                        {selectedProduct.option3Name && <th>{selectedProduct.option3Name}</th>}
                        <th style={{ textAlign: "right" }}>Giá nhập</th>
                        <th style={{ textAlign: "right" }}>Giá bán</th>
                        <th style={{ textAlign: "center" }}>Tồn kho</th>
                        <th style={{ textAlign: "center" }}>Trạng thái</th>
                        <th style={{ textAlign: "center", width: "90px" }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProduct.variants.map((v) => (
                        <tr key={v.id} className={checkedVariantIds.has(v.id) ? styles.variantRowChecked : ""}>
                          <td style={{ textAlign: "center" }}><input type="checkbox" className={styles.variantCheckbox} checked={checkedVariantIds.has(v.id)} onChange={() => { setCheckedVariantIds((prev) => { const next = new Set(prev); next.has(v.id) ? next.delete(v.id) : next.add(v.id); return next; }); }} /></td>
                          <td><code>{v.sku}</code></td>
                          {selectedProduct.option1Name && <td>{v.option1Value || "—"}</td>}
                          {selectedProduct.option2Name && <td>{v.option2Value || "—"}</td>}
                          {selectedProduct.option3Name && <td>{v.option3Value || "—"}</td>}
                          <td style={{ textAlign: "right" }}>{formatCurrency(v.importPrice)}</td>
                          <td style={{ textAlign: "right" }}>{formatCurrency(v.salePrice)}</td>
                          <td style={{ textAlign: "center" }}><span className={[styles.variantStockBadge, v.stock < 20 ? styles.variantLowStock : ""].join(" ")}>{v.stock}</span></td>
                          <td style={{ textAlign: "center" }}><span className={[styles.statusBadge, v.status?.toUpperCase() === "ACTIVE" ? styles.statusActive : styles.statusInactive].join(" ")}>{v.status?.toUpperCase() === "ACTIVE" ? "Đang bán" : "Ngừng bán"}</span></td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                              <Button variant="ghost" size="sm" icon="fi fi-rr-eye" onClick={() => setSelectedVariant(v)}>Xem</Button>
                              <Button variant="danger" size="sm" icon="fi fi-rr-trash" onClick={(e) => { e.stopPropagation(); if (v.status?.toUpperCase() !== "ACTIVE") showToast("Sản phẩm đã ngừng bán!", "error"); else setDeleteVariantId(v.id); }}>Xóa</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => { setSelectedProduct(null); setCheckedVariantIds(new Set()); }}>Đóng</Button>
              <Button variant="secondary" icon="fi fi-rr-edit" onClick={() => handleEdit(selectedProduct)}>Chỉnh sửa</Button>
            </div>
          </>
        )}
      </Modal>

      {/* Edit product modal */}
      <EditProductModal
        isOpen={isEditOpen}
        product={selectedProduct}
        form={form}
        errors={errors}
        attributes={attributes}
        tagInputs={tagInputs}
        variantPriceOverrides={variantPriceOverrides}
        removedVariantLabels={removedVariantLabels}
        editingVariantLabel={editingVariantLabel}
        editingPrices={editingPrices}
        categories={categories}
        onClose={() => { setIsEditOpen(false); setSelectedProduct(null); setErrors({}); }}
        onFormChange={(field, value) => { setForm((prev) => ({ ...prev, [field]: value })); if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" })); }}
        onAttributesChange={setAttributes}
        onTagInputsChange={setTagInputs}
        onSave={handleSave}
        onStartEditVariant={(v) => {
          const ov = variantPriceOverrides[v.label];
          setEditingPrices({ importPrice: ov?.importPrice || String(form.importPrice), salePrice: ov?.salePrice || String(form.salePrice) });
          setEditingVariantLabel(v.label);
        }}
        onConfirmEditVariant={(label) => {
          setVariantPriceOverrides((prev) => {
            const next = { ...prev };
            const imp = editingPrices.importPrice.trim();
            const sal = editingPrices.salePrice.trim();
            const isImpOv = imp !== "" && imp !== String(form.importPrice);
            const isSalOv = sal !== "" && sal !== String(form.salePrice);
            if (!isImpOv && !isSalOv) delete next[label]; else next[label] = { importPrice: isImpOv ? imp : "", salePrice: isSalOv ? sal : "" };
            return next;
          });
          setEditingVariantLabel(null);
        }}
        onCancelEditVariant={() => setEditingVariantLabel(null)}
        onRemoveVariant={(label) => setRemovedVariantLabels((prev) => new Set([...prev, label]))}
        onEditingPriceChange={(field, value) => setEditingPrices((prev) => ({ ...prev, [field]: value }))}
        isFormUnchanged={isFormUnchanged}
        onShowToast={showToast}
      />

      {/* Variant modals */}
      <EditVariantModal
        isDetailOpen={isVariantDetailOpen}
        isEditOpen={isVariantEditOpen}
        variant={selectedVariant}
        product={selectedProduct}
        form={variantForm}
        errors={variantErrors}
        activeTab={activeVariantTab}
        txHistory={txHistory}
        txPage={txPage}
        txTotalElements={txTotalElements}
        txPageSize={txPageSize}
        txLoading={txLoading}
        poDetail={poDetail}
        poDetailLoading={poDetailLoading}
        quickViewUserId={quickViewUserId}
        onTabChange={(tab) => { setActiveVariantTab(tab); if (tab === "history" && txHistory.length === 0 && selectedVariant) fetchTxHistory(selectedVariant.id, 1); }}
        onClose={closeVariantModals}
        onOpenEdit={() => selectedVariant && handleVariantEdit(selectedVariant)}
        onFormChange={(field, value) => { setVariantForm((prev) => ({ ...prev, [field]: value })); }}
        onSave={handleVariantSave}
        onTxPageChange={(page) => { setTxPage(page); if (selectedVariant) fetchTxHistory(selectedVariant.id, page); }}
        onPOLinkClick={handlePOLinkClick}
        onPoDetailClose={() => setPoDetail(null)}
        onUserClick={(id, name) => { setQuickViewUserId(id); setQuickViewUserName(name); }}
      />

      {/* Bulk edit */}
      <BulkEditVariantModal
        isOpen={isBulkEditOpen}
        checkedCount={checkedVariantIds.size}
        form={bulkForm}
        errors={bulkErrors}
        onClose={() => setIsBulkEditOpen(false)}
        onFormChange={(field, value) => { setBulkForm((prev) => ({ ...prev, [field]: value })); if (bulkErrors[field]) setBulkErrors((prev) => ({ ...prev, [field]: "" })); }}
        onSave={handleBulkSave}
      />

      {/* Confirm dialogs */}
      <ConfirmDialog isOpen={!!deleteProductId} title="Xóa sản phẩm" message={`Bạn có chắc chắn muốn xóa sản phẩm "${products.find((p) => p.id === deleteProductId)?.name ?? ""}"? Hành động này không thể hoàn tác.`} confirmLabel="Xóa" onConfirm={handleDeleteProduct} onCancel={() => setDeleteProductId(null)} />
      <ConfirmDialog isOpen={!!deleteVariantId} title="Xóa phiên bản" message={`Bạn có chắc chắn muốn xóa phiên bản "${selectedProduct?.variants.find((v) => v.id === deleteVariantId)?.sku ?? ""}"?`} confirmLabel="Xóa" onConfirm={handleDeleteVariant} onCancel={() => setDeleteVariantId(null)} />
      <ConfirmDialog isOpen={isBulkDeleteConfirmOpen} title="Xóa hàng loạt phiên bản" message={`Bạn có chắc chắn muốn xóa ${checkedVariantIds.size} phiên bản đã chọn?`} confirmLabel="Xóa" onConfirm={handleBulkDelete} onCancel={() => setIsBulkDeleteConfirmOpen(false)} />

      <UserDetailModal
        userId={quickViewUserId}
        userName={quickViewUserName}
        onClose={() => { setQuickViewUserId(null); setQuickViewUserName(""); }}
      />
    </section>
  );
}
