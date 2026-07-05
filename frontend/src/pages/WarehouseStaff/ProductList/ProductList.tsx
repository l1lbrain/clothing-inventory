import { useState, useEffect, useMemo } from "react";
import type {
  Product,
  Variant,
} from "../../../types/product.types";
import { Table } from "../../../components/Table/Table";
import { SearchBox } from "../../../components/SearchBox/SearchBox";
import { Pagination } from "../../../components/Pagination/Pagination";
import { Select } from "../../../components/Select/Select";
import { Card, CardHeader, CardBody } from "../../../components/Card/Card";
import type { TableColumn } from "../../../types/common.types";
import { formatCurrency, formatDateTime } from "../../../utils/formatters";
import { getProductsPage, deleteProduct, deleteVariant, deleteVariants, bulkUpdateVariantPrices, updateProduct, mapBackendProductToFrontend, type ProductUpdatePayload, updateVariant, type VariantUpdatePayload, getCategories, type CategoryResponseDto } from "../../../services/product";
import { Modal } from "../../../components/Modal/Modal";
import { Button } from "../../../components/Button/Button";
import { useToast } from "../../../components/Toast/ToastContext";
import { Input } from "../../../components/Input/Input";
import {
  validate,
  isRequired,
  isPositiveNumber,
} from "../../../utils/validators";
import { ConfirmDialog } from "../../../components/ConfirmDialog/ConfirmDialog";
import { getTransactionsByVariantId, type InventoryTransactionDto } from "../../../services/inventoryTransaction";
import type { PurchaseOrder } from "../../../types/purchaseOrder.types";
import styles from "./ProductList.module.css";

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);
  const [form, setForm] = useState({
    code: "",
    sku: "",
    name: "",
    category: "",
    unit: "Cái",
    importPrice: "",
    salePrice: "",
    description: "",
    brand: "",
    status: "ACTIVE",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

  const categoryOptions = useMemo(() => {
    return [
      { value: "", label: "Tất cả danh mục" },
      ...categories.map((cat) => ({
        value: cat.name,
        label: cat.name,
      })),
    ];
  }, [categories]);

  const formCategoryOptions = useMemo(() => {
    return categories.map((cat) => ({
      value: String(cat.id),
      label: cat.name,
    }));
  }, [categories]);

  // Trạng thái quản lý thuộc tính khi Chỉnh sửa sản phẩm
  interface ProductAttribute {
    name: string;
    values: string[];
  }
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [tagInputs, setTagInputs] = useState<string[]>(["", "", ""]);
  const [variantPriceOverrides, setVariantPriceOverrides] = useState<
    Record<string, { importPrice: string; salePrice: string }>
  >({});
  const [removedVariantLabels, setRemovedVariantLabels] = useState<Set<string>>(
    new Set(),
  );
  const [editingVariantLabel, setEditingVariantLabel] = useState<string | null>(
    null,
  );
  const [editingPrices, setEditingPrices] = useState({
    importPrice: "",
    salePrice: "",
  });

  interface VariantRow {
    label: string;
    values: string[];
  }
  const previewVariants = useMemo((): VariantRow[] => {
    const activeAttrs = attributes.filter(
      (a) => a.name.trim() && a.values.length > 0
    );
    if (activeAttrs.length === 0) return [];
    const cartesian = (arrays: string[][]): string[][] => {
      return arrays.reduce<string[][]>(
        (acc, arr) => acc.flatMap((prev: string[]) => arr.map((val: string) => [...prev, val])),
        [[]]
      );
    };
    const combos = cartesian(activeAttrs.map((a) => a.values));
    return combos.map((vals) => ({
      label: vals.join(" / "),
      values: vals,
    }));
  }, [attributes]);

  const visibleVariants = previewVariants.filter(
    (v: VariantRow) => !removedVariantLabels.has(v.label)
  );

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [isVariantEditOpen, setIsVariantEditOpen] = useState(false);
  const [variantForm, setVariantForm] = useState({
    sku: "",
    importPrice: "",
    salePrice: "",
    option1Value: "",
    option2Value: "",
    option3Value: "",
    stock: "",
    note: "",
    adjustReason: "",
    status: "ACTIVE",
  });

  // Trạng thái chọn nhiều
  const [checkedVariantIds, setCheckedVariantIds] = useState<Set<string>>(
    new Set(),
  );
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({ importPrice: "", salePrice: "", status: "" });
  const [bulkErrors, setBulkErrors] = useState<Record<string, string>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [sortBy, setSortBy] = useState<"name" | "brand" | "createdAt" | "updatedAt">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Trạng thái xác nhận xóa
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteVariantId, setDeleteVariantId] = useState<string | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  // Trạng thái tab trong modal "Chi tiết phiên bản"
  const [activeVariantTab, setActiveVariantTab] = useState<"info" | "history">("info");

  // Trạng thái lịch sử giao dịch kho của phiên bản
  const [txHistory, setTxHistory] = useState<InventoryTransactionDto[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txTotalElements, setTxTotalElements] = useState(0);
  const [txPageSize, setTxPageSize] = useState(10);
  const [txLoading, setTxLoading] = useState(false);

  // Modal chi tiết đơn đặt hàng khi click vào mã PO trong bảng transaction
  const [poDetail, setPoDetail] = useState<PurchaseOrder | null>(null);
  const [poDetailLoading, setPoDetailLoading] = useState(false);

  const { showToast } = useToast();

  // Debounce tìm kiếm
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await getProductsPage(
          currentPage,
          debouncedQuery.trim() || undefined,
          statusFilter || undefined,
          sortBy,
          sortDir
        );
        setProducts(data.items);
        setTotalElements(data.totalElements);
        setPageSize(data.pageSize);
      } catch (err) {
        console.error("Failed to fetch products from backend API:", err);
        showToast("Không thể tải danh sách sản phẩm từ máy chủ!", "error");
        setProducts([]);
        setTotalElements(0);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [currentPage, refreshTrigger, showToast, debouncedQuery, sortBy, sortDir, statusFilter]);

  const handleSort = (field: "name" | "brand" | "createdAt" | "updatedAt") => {
    console.log("[ProductList Sort] Clicked:", field, "Current state:", { sortBy, sortDir });
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const buildSortHeader = (
    label: string,
    field: "name" | "brand" | "createdAt" | "updatedAt",
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

  // Danh sách sản phẩm đã lọc
  const displayProducts = (() => {
    if (categoryFilter) {
      return products.filter(
        (p) => p.categoryLabel.toLowerCase() === categoryFilter.toLowerCase()
      );
    }
    return products;
  })();

  const openDetail = (product: Product) => {
    setSelectedProduct(product);
    setCheckedVariantIds(new Set());
  };

  const handleEdit = (product: Product) => {
    const matchedCategory = categories.find(
      (cat) => cat.name.toLowerCase() === product.categoryLabel.toLowerCase()
    );
    const categoryVal = matchedCategory ? String(matchedCategory.id) : "";

    setForm({
      code: product.code,
      sku: product.sku,
      name: product.name,
      category: categoryVal,
      unit: product.unit || "Cái",
      importPrice: String(product.importPrice),
      salePrice: String(product.salePrice),
      description: product.description || "",
      brand: product.brand || "",
      status: product.status || "ACTIVE",
    });
    setErrors({});

    // Phân tích thuộc tính hiện tại từ các biến thể của sản phẩm
    const currentAttrs: ProductAttribute[] = [];

    if (product.option1Name) {
      const values = Array.from(new Set(product.variants.map((v) => v.option1Value).filter(Boolean))) as string[];
      if (values.length > 0) {
        currentAttrs.push({ name: product.option1Name, values });
      }
    }
    if (product.option2Name) {
      const values = Array.from(new Set(product.variants.map((v) => v.option2Value).filter(Boolean))) as string[];
      if (values.length > 0) {
        currentAttrs.push({ name: product.option2Name, values });
      }
    }
    if (product.option3Name) {
      const values = Array.from(new Set(product.variants.map((v) => v.option3Value).filter(Boolean))) as string[];
      if (values.length > 0) {
        currentAttrs.push({ name: product.option3Name, values });
      }
    }

    // Nếu không có option nào được định nghĩa thì không có thuộc tính để hiển thị
    // (trường hợp này sản phẩm không có variant attributes)

    setAttributes(currentAttrs);
    setTagInputs(["", "", ""]);

    // Build variantPriceOverrides dựa vào option1/2/3Value (index-based, không hardcode tên)
    const overrides: Record<string, { importPrice: string; salePrice: string }> = {};
    product.variants.forEach((v) => {
      const vals: string[] = [];
      if (currentAttrs.length >= 1 && v.option1Value) vals.push(v.option1Value);
      if (currentAttrs.length >= 2 && v.option2Value) vals.push(v.option2Value);
      if (currentAttrs.length >= 3 && v.option3Value) vals.push(v.option3Value);

      if (vals.length > 0) {
        const label = vals.join(" / ");
        overrides[label] = {
          importPrice: String(v.importPrice),
          salePrice: String(v.salePrice),
        };
      }
    });

    setVariantPriceOverrides(overrides);
    setRemovedVariantLabels(new Set());
    setEditingVariantLabel(null);

    setSelectedProduct(product);
    setIsEditOpen(true);
  };

  const addAttribute = () => {
    if (attributes.length >= 3) return;
    const defaultNames = ["Màu sắc", "Kích thước", "Chất liệu"];
    const name =
      defaultNames.find(
        (dName) => !attributes.some((attr) => attr.name === dName),
      ) || "";
    setAttributes((prev) => [...prev, { name, values: [] }]);
  };

  const removeAttribute = (index: number) => {
    if (selectedProduct) {
      // Thuộc tính ở vị trí index tương ứng với option(index+1)Value trên variant
      const getOptionVal = (v: Variant) =>
        index === 0 ? v.option1Value : index === 1 ? v.option2Value : v.option3Value;

      const withStock = selectedProduct.variants.filter(
        (v) => v.stock > 0 && !!getOptionVal(v)
      );

      if (withStock.length > 0) {
        showToast(`Không thể xóa thuộc tính “${attributes[index].name}” vì có phiên bản vẫn còn tồn kho!`, "warning");
        return;
      }
    }

    setAttributes((prev) => prev.filter((_, idx) => idx !== index));
    setTagInputs((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      copy.push(""); // Keep length 3
      return copy;
    });
  };

  const updateAttributeName = (index: number, name: string) => {
    setAttributes((prev) =>
      prev.map((attr, idx) => {
        if (idx !== index) return attr;
        return { ...attr, name };
      }),
    );
  };

  const updateTagInput = (index: number, value: string) => {
    setTagInputs((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const removeAttributeValue = (attrIndex: number, valIndex: number) => {
    const attr = attributes[attrIndex];
    const val = attr.values[valIndex];
    if (selectedProduct) {
      // Thuộc tính ở vị trí attrIndex tương ứng với option(attrIndex+1)Value
      const getOptionVal = (v: Variant) =>
        attrIndex === 0 ? v.option1Value : attrIndex === 1 ? v.option2Value : attrIndex === 2 ? v.option3Value : undefined;

      const withStock = selectedProduct.variants.filter((v) => {
        if (v.stock <= 0) return false;
        return getOptionVal(v)?.toLowerCase() === val.toLowerCase();
      });

      if (withStock.length > 0) {
        showToast(`Không thể xóa giá trị “${val}” vì có phiên bản vẫn còn tồn kho!`, "warning");
        return;
      }
    }

    setAttributes((prev) =>
      prev.map((attr, idx) => {
        if (idx !== attrIndex) return attr;
        return {
          ...attr,
          values: attr.values.filter((_, vIdx) => vIdx !== valIndex),
        };
      }),
    );
  };

  const handleTagKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    attrIndex: number,
  ) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const value = tagInputs[attrIndex].trim();
      if (value) {
        const newVals = value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        setAttributes((prev) =>
          prev.map((attr, idx) => {
            if (idx !== attrIndex) return attr;
            const filtered = newVals.filter((v) => !attr.values.includes(v));
            return {
              ...attr,
              values: [...attr.values, ...filtered],
            };
          }),
        );
        setTagInputs((prev) => {
          const copy = [...prev];
          copy[attrIndex] = "";
          return copy;
        });
        setRemovedVariantLabels(new Set());
      }
    } else if (e.key === "Backspace" && !tagInputs[attrIndex]) {
      setAttributes((prev) =>
        prev.map((attr, idx) => {
          if (idx !== attrIndex || attr.values.length === 0) return attr;
          return {
            ...attr,
            values: attr.values.slice(0, -1),
          };
        }),
      );
    }
  };

  const handleTagBlur = (attrIndex: number) => {
    const value = tagInputs[attrIndex].trim();
    if (value) {
      const newVals = value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      setAttributes((prev) =>
        prev.map((attr, idx) => {
          if (idx !== attrIndex) return attr;
          const filtered = newVals.filter((v) => !attr.values.includes(v));
          return {
            ...attr,
            values: [...attr.values, ...filtered],
          };
        }),
      );
      setTagInputs((prev) => {
        const copy = [...prev];
        copy[attrIndex] = "";
        return copy;
      });
      setRemovedVariantLabels(new Set());
    }
  };

  const startEditVariant = (v: { label: string }) => {
    const override = variantPriceOverrides[v.label];
    setEditingPrices({
      importPrice: override?.importPrice || String(form.importPrice),
      salePrice: override?.salePrice || String(form.salePrice),
    });
    setEditingVariantLabel(v.label);
  };

  const confirmEditVariant = (label: string) => {
    setVariantPriceOverrides((prev) => {
      const next = { ...prev };
      const imp = editingPrices.importPrice.trim();
      const sale = editingPrices.salePrice.trim();

      const isImpOverridden = imp !== "" && imp !== String(form.importPrice);
      const isSaleOverridden = sale !== "" && sale !== String(form.salePrice);

      if (!isImpOverridden && !isSaleOverridden) {
        delete next[label];
      } else {
        next[label] = {
          importPrice: isImpOverridden ? imp : "",
          salePrice: isSaleOverridden ? sale : "",
        };
      }
      return next;
    });
    setEditingVariantLabel(null);
  };

  const cancelEditVariant = () => setEditingVariantLabel(null);

  const removeVariant = (label: string) => {
    const newRemovedLabels = new Set([...removedVariantLabels, label]);
    setRemovedVariantLabels(newRemovedLabels);
    if (editingVariantLabel === label) setEditingVariantLabel(null);

    const remaining = previewVariants.filter(
      (v: VariantRow) => !newRemovedLabels.has(v.label),
    );

    const activeAttrs = attributes.filter(
      (a) => a.name.trim() && a.values.length > 0,
    );

    const usedValueSets = activeAttrs.map(
      (_, attrIdx) =>
        new Set(remaining.map((v: VariantRow) => v.values[attrIdx]).filter(Boolean)),
    );

    setAttributes((prev) => {
      let activeIdx = 0;
      const updated = prev
        .map((attr) => {
          const isActive = attr.name.trim() && attr.values.length > 0;
          if (!isActive) return attr;
          const used = usedValueSets[activeIdx] ?? new Set<string>();
          activeIdx++;
          return { ...attr, values: attr.values.filter((v) => used.has(v)) };
        })
        .filter((attr) => attr.values.length > 0);

      setTagInputs((ti) => {
        const next = updated.map((_, i) => ti[i] ?? "");
        while (next.length < 3) next.push("");
        return next;
      });

      return updated;
    });
  };

  const handleChange =
    (field: string) =>
      (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
      ) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
      };

  const formatInputNumber = (val: string | number) => {
    if (!val && val !== 0) return "";
    const cleanVal = String(val)
      .replace(/\./g, "")
      .replace(/[^0-9]/g, "");
    if (!cleanVal) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(cleanVal));
  };

  const handleSave = async () => {
    const errs = validate(form, {
      name: [isRequired],
      category: [isRequired],
      unit: [isRequired],
    });

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    if (!selectedProduct) return;

    let newVariants: Variant[];
    if (attributes.length === 0) {
      const existing = selectedProduct.variants[0];
      const impPrice = Number(String(form.importPrice || 0).replace(/\./g, ""));
      const salPrice = Number(String(form.salePrice || 0).replace(/\./g, ""));
      newVariants = [{
        id: existing?.id || "temp-0",
        sku: existing?.sku || form.code || "",
        importPrice: impPrice,
        salePrice: salPrice,
        stock: existing?.stock || 0,
        note: existing?.note || "",
        status: form.status,
      }];
    } else {
      newVariants = visibleVariants.map((vv: VariantRow, idx: number) => {
        const opt1Val = vv.values[0] || "";
        const opt2Val = vv.values[1] || "";
        const opt3Val = vv.values[2] || "";

        const existing = selectedProduct.variants.find(
          (v) =>
            (opt1Val ? v.option1Value === opt1Val : !v.option1Value) &&
            (opt2Val ? v.option2Value === opt2Val : !v.option2Value) &&
            (opt3Val ? v.option3Value === opt3Val : !v.option3Value)
        );

        const override = variantPriceOverrides[vv.label];
        const impPrice = override?.importPrice ? Number(override.importPrice.replace(/\./g, "")) : Number(form.importPrice || 0);
        const salePrice = override?.salePrice ? Number(override.salePrice.replace(/\./g, "")) : Number(form.salePrice || 0);

        return {
          id: existing?.id || `temp-${idx}`,
          sku: existing?.sku || `${form.code}-${idx + 1}`,
          importPrice: impPrice,
          salePrice: salePrice,
          stock: existing?.stock || 0,
          option1Value: opt1Val || undefined,
          option2Value: opt2Val || undefined,
          option3Value: opt3Val || undefined,
          note: existing?.note || "",
          status: form.status,
        };
      });
    }

    const payload: ProductUpdatePayload = {
      name: form.name,
      categoryId: Number(form.category),
      brand: form.brand || "",
      unit: form.unit,
      description: form.description || "",
      status: form.status,
      option1Name: attributes[0]?.name || null,
      option2Name: attributes[1]?.name || null,
      option3Name: attributes[2]?.name || null,
      variants: newVariants.map((v) => {
        const idNum = Number(v.id);
        return {
          id: isNaN(idNum) || idNum > 1e13 ? null : idNum,
          sku: v.sku || null,
          option1Value: v.option1Value || null,
          option2Value: v.option2Value || null,
          option3Value: v.option3Value || null,
          purchasePrice: v.importPrice,
          salePrice: v.salePrice,
          status: v.status || "ACTIVE",
        };
      }),
    };

    try {
      const responseData = await updateProduct(selectedProduct.id, payload);
      const updatedProductFromApi = mapBackendProductToFrontend(responseData);

      setProducts((prev) =>
        prev.map((p) => (p.id === selectedProduct.id ? updatedProductFromApi : p))
      );

      showToast("Cập nhật sản phẩm thành công!", "success");
      closeAllModals();
      triggerRefresh();
    } catch (err) {
      console.error("Lỗi khi cập nhật sản phẩm:", err);
      const errorMsg = err instanceof Error ? err.message : "";
      if (errorMsg === "Cannot update variant with existing transactions") {
        showToast("Không được phép sửa giá trị thuộc tính của phiên bản đã có giao dịch", "error");
      } else if (errorMsg === "Cannot delete variant with existing transactions") {
        showToast("Không được phép thay đổi số lượng thuộc tính do đã tồn tại giao dịch", "error");
      } else {
        showToast("Cập nhật sản phẩm thất bại", "error");
      }
    }
  };

  const closeAllModals = () => {
    setIsEditOpen(false);
    setSelectedProduct(null);
    setErrors({});
  };

  const isFormUnchanged = () => {
    if (!selectedProduct) return true;

    // Kiểm tra thuộc tính thay đổi
    // So sánh thuộc tính dựa vào option1/2/3Name (tên thực của sản phẩm)
    const currentAttrs: ProductAttribute[] = [];
    if (selectedProduct.option1Name) {
      const vals = Array.from(new Set(selectedProduct.variants.map((v) => v.option1Value).filter(Boolean))) as string[];
      if (vals.length > 0) currentAttrs.push({ name: selectedProduct.option1Name, values: vals });
    }
    if (selectedProduct.option2Name) {
      const vals = Array.from(new Set(selectedProduct.variants.map((v) => v.option2Value).filter(Boolean))) as string[];
      if (vals.length > 0) currentAttrs.push({ name: selectedProduct.option2Name, values: vals });
    }
    if (selectedProduct.option3Name) {
      const vals = Array.from(new Set(selectedProduct.variants.map((v) => v.option3Value).filter(Boolean))) as string[];
      if (vals.length > 0) currentAttrs.push({ name: selectedProduct.option3Name, values: vals });
    }
    if (selectedProduct.option1Name) {
      const vals = Array.from(new Set(selectedProduct.variants.map((v) => v.option1Value).filter(Boolean))) as string[];
      if (vals.length > 0) currentAttrs.push({ name: selectedProduct.option1Name, values: vals });
    }
    if (selectedProduct.option2Name) {
      const vals = Array.from(new Set(selectedProduct.variants.map((v) => v.option2Value).filter(Boolean))) as string[];
      if (vals.length > 0) currentAttrs.push({ name: selectedProduct.option2Name, values: vals });
    }
    if (selectedProduct.option3Name) {
      const vals = Array.from(new Set(selectedProduct.variants.map((v) => v.option3Value).filter(Boolean))) as string[];
      if (vals.length > 0) currentAttrs.push({ name: selectedProduct.option3Name, values: vals });
    }

    const attrsChanged = JSON.stringify(attributes) !== JSON.stringify(currentAttrs);

    return (
      !attrsChanged &&
      form.code === selectedProduct.code &&
      form.sku === selectedProduct.sku &&
      form.name === selectedProduct.name &&
      form.category === selectedProduct.category &&
      form.unit === (selectedProduct.unit || "Cái") &&
      form.description === (selectedProduct.description || "") &&
      form.brand === (selectedProduct.brand || "") &&
      form.status === (selectedProduct.status || "ACTIVE")
    );
  };

  const handleVariantEdit = (variant: Variant) => {
    setVariantForm({
      sku: variant.sku,
      importPrice: String(variant.importPrice),
      salePrice: String(variant.salePrice),
      option1Value: variant.option1Value || "",
      option2Value: variant.option2Value || "",
      option3Value: variant.option3Value || "",
      stock: String(variant.stock),
      note: variant.note || "",
      adjustReason: "",
      status: variant.status?.toUpperCase() === "ACTIVE" ? "ACTIVE" : "INACTIVE",
    });
    setErrors({});
    setSelectedVariant(variant);
    setIsVariantEditOpen(true);
  };

  const handleVariantSave = async () => {
    const errs = validate(variantForm, {
      importPrice: [(v) => isPositiveNumber(v)],
      salePrice: [(v) => isPositiveNumber(v)],
    });

    // Validate lý do điều chỉnh – bắt buộc khi và chỉ khi số lượng thay đổi
    const stockChanged =
      selectedVariant &&
      Number(variantForm.stock) !== selectedVariant.stock;
    if (stockChanged && !variantForm.adjustReason.trim()) {
      errs.adjustReason = "Vui lòng nhập lý do thay đổi số lượng";
    }

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    if (!selectedProduct || !selectedVariant) return;

    // Kiểm tra trùng biến thể (so sánh theo option1/2/3Value)
    const isDuplicate = selectedProduct.variants.some((v) => {
      if (v.id === selectedVariant.id) return false;
      return (
        (v.option1Value || "").trim().toLowerCase() === (variantForm.option1Value || "").trim().toLowerCase() &&
        (v.option2Value || "").trim().toLowerCase() === (variantForm.option2Value || "").trim().toLowerCase() &&
        (v.option3Value || "").trim().toLowerCase() === (variantForm.option3Value || "").trim().toLowerCase()
      );
    });

    if (isDuplicate) {
      showToast("Không thể lưu vì phiên bản với các thuộc tính này đã tồn tại!", "error");
      return;
    }

    try {
      // Gửi trực tiếp option1/2/3Value (index-based), không dùng keyword matching
      const payload: VariantUpdatePayload = {
        option1Value: variantForm.option1Value || null,
        option2Value: variantForm.option2Value || null,
        option3Value: variantForm.option3Value || null,
        purchasePrice: Number(variantForm.importPrice),
        salePrice: Number(variantForm.salePrice),
        status: variantForm.status,
        quantityOnHand: Number(variantForm.stock),
        adjustReason: stockChanged ? variantForm.adjustReason.trim() : null,
      };

      const updatedProductFromApi = await updateVariant(selectedVariant.id, payload);
      const mappedProduct = mapBackendProductToFrontend(updatedProductFromApi);

      setProducts((prev) =>
        prev.map((p) => (p.id === selectedProduct.id ? mappedProduct : p))
      );
      setSelectedProduct(mappedProduct);

      showToast("Cập nhật phiên bản thành công!", "success");
      closeVariantModals();
      triggerRefresh();
    } catch (err) {
      console.error("Lỗi khi cập nhật phiên bản:", err);
      const errorMsg = err instanceof Error ? err.message : "";
      if (errorMsg === "Cannot update variant with existing transactions") {
        showToast("Không được phép sửa giá trị thuộc tính của phiên bản đã có giao dịch", "error");
      } else {
        showToast("Cập nhật phiên bản thất bại!", "error");
      }
    }
  };

  const closeVariantModals = () => {
    setIsVariantEditOpen(false);
    setSelectedVariant(null);
    setErrors({});
    // Reset tab state và tx history khi đóng modal
    setActiveVariantTab("info");
    setTxHistory([]);
    setTxPage(1);
    setTxTotalElements(0);
  };

  // Fetch lịch sử giao dịch kho theo variantId và trang hiện tại
  const fetchTxHistory = async (variantId: string, page: number) => {
    try {
      setTxLoading(true);
      const result = await getTransactionsByVariantId(variantId, page);
      setTxHistory(result.items);
      setTxTotalElements(result.totalElements);
      setTxPageSize(result.pageSize);
    } catch (err) {
      console.error("Failed to fetch transaction history:", err);
      showToast("Không thể tải lịch sử giao dịch!", "error");
    } finally {
      setTxLoading(false);
    }
  };

  // Xử lý click vào mã PO trong bảng transaction
  const handlePOLinkClick = async (poCode: string) => {
    // Tìm đơn PO theo code bằng cách tìm trong txHistory
    const tx = txHistory.find((t) => t.purchaseOrderCode === poCode);
    if (!tx?.purchaseOrderDetailId) return;

    // Lấy purchaseOrderId từ backend thông qua purchaseOrderDetailId
    // Hiện tại API getPurchaseOrderById nhận PO id, không phải detail id.
    // Ta dùng purchaseOrderCode để gọi API search — nhưng không có endpoint search by code.
    // Thay vào đó, ta search danh sách và lọc theo code.
    // Approach đơn giản hơn: gọi API purchase-orders với keyword = poCode
    try {
      setPoDetailLoading(true);
      // Import getReceivedPurchaseOrdersPage để tìm PO theo code
      // Tạm dùng getPurchaseOrdersPage filter theo keyword (code)
      const { getPurchaseOrdersPage } = await import("../../../services/purchaseOrder");
      const result = await getPurchaseOrdersPage(1, poCode);
      const found = result.items.find((o) => o.code === poCode);
      if (found) {
        setPoDetail(found);
      } else {
        showToast("Không tìm thấy đơn đặt hàng này!", "warning");
      }
    } catch (err) {
      console.error("Failed to fetch PO detail:", err);
      showToast("Không thể tải chi tiết đơn đặt hàng!", "error");
    } finally {
      setPoDetailLoading(false);
    }
  };

  // Xóa chọn khi đóng hoặc đổi sản phẩm
  const resetChecked = () => setCheckedVariantIds(new Set());

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  const handleDeleteProduct = async () => {
    if (!deleteProductId) return;
    const targetProduct = products.find((p) => p.id === deleteProductId);
    if (targetProduct && targetProduct.variants.some((v) => v.hasTransactions)) {
      showToast("Không thể xóa vì đã tồn tại hóa đơn nhập hàng!", "warning");
      setDeleteProductId(null);
      return;
    }

    try {
      await deleteProduct(deleteProductId);
      showToast("Đã xóa sản phẩm", "success");
      if (selectedProduct?.id === deleteProductId) setSelectedProduct(null);
      triggerRefresh();
    } catch {
      showToast("Xóa sản phẩm thất bại", "error");
    } finally {
      setDeleteProductId(null);
    }
  };

  const handleDeleteVariant = async () => {
    if (!deleteVariantId) return;
    try {
      await deleteVariant(deleteVariantId);
      setSelectedProduct((prev) =>
        prev
          ? {
            ...prev,
            variants: prev.variants.map((v) =>
              v.id === deleteVariantId ? { ...v, status: "DELETED" } : v
            ),
          }
          : null
      );
      showToast("Ngừng bán sản phẩm thành công!", "success");
      triggerRefresh();
    } catch {
      showToast("Xóa phiên bản thất bại", "error");
    } finally {
      setDeleteVariantId(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await deleteVariants([...checkedVariantIds]);
      setSelectedProduct((prev) =>
        prev
          ? {
            ...prev,
            variants: prev.variants.map((v) =>
              checkedVariantIds.has(v.id) ? { ...v, status: "DELETED" } : v
            ),
          }
          : null
      );
      showToast(`Đổi trạng thái thành Ngừng bán thành công cho ${checkedVariantIds.size} phiên bản!`, "success");
      setCheckedVariantIds(new Set());
      triggerRefresh();
    } catch {
      showToast("Xóa phiên bản thất bại", "error");
    } finally {
      setIsBulkDeleteConfirmOpen(false);
    }
  };

  const toggleVariantCheck = (id: string) => {
    setCheckedVariantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVariants = (variants: Variant[]) => {
    if (checkedVariantIds.size === variants.length) {
      setCheckedVariantIds(new Set());
    } else {
      setCheckedVariantIds(new Set(variants.map((v) => v.id)));
    }
  };

  const openBulkEdit = () => {
    setBulkForm({ importPrice: "", salePrice: "", status: "" });
    setBulkErrors({});
    setIsBulkEditOpen(true);
  };

  const handleBulkSave = async () => {
    const errs: Record<string, string> = {};
    if (!bulkForm.importPrice && !bulkForm.salePrice && !bulkForm.status) {
      errs.importPrice = "Vui lòng nhập giá hoặc chọn trạng thái để cập nhật";
    }
    if (
      bulkForm.importPrice &&
      isNaN(Number(bulkForm.importPrice.replace(/\./g, "")))
    ) {
      errs.importPrice = "Giá nhập không hợp lệ";
    }
    if (
      bulkForm.salePrice &&
      isNaN(Number(bulkForm.salePrice.replace(/\./g, "")))
    ) {
      errs.salePrice = "Giá bán không hợp lệ";
    }
    if (Object.keys(errs).length) {
      setBulkErrors(errs);
      return;
    }
    if (!selectedProduct) return;

    const newImport = bulkForm.importPrice
      ? Number(bulkForm.importPrice.replace(/\./g, ""))
      : null;
    const newSale = bulkForm.salePrice
      ? Number(bulkForm.salePrice.replace(/\./g, ""))
      : null;

    try {
      await bulkUpdateVariantPrices({
        variantIds: [...checkedVariantIds].map(Number),
        purchasePrice: newImport,
        salePrice: newSale,
        status: bulkForm.status ? bulkForm.status.toUpperCase() : null,
      });

      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== selectedProduct.id) return p;
          const updatedVariants = p.variants.map((v) => {
            if (!checkedVariantIds.has(v.id)) return v;
            return {
              ...v,
              ...(newImport !== null ? { importPrice: newImport } : {}),
              ...(newSale !== null ? { salePrice: newSale } : {}),
              ...(bulkForm.status ? { status: bulkForm.status } : {}),
            };
          });
          const importPrices = updatedVariants.map((v) => v.importPrice);
          const salePrices = updatedVariants.map((v) => v.salePrice);
          const hasActiveVariant = updatedVariants.some((v) => v.status === "ACTIVE" || v.status === "active" || !v.status);
          const updated = {
            ...p,
            importPrice: importPrices.length ? Math.min(...importPrices) : 0,
            salePrice: salePrices.length ? Math.min(...salePrices) : 0,
            variants: updatedVariants,
            status: hasActiveVariant ? "ACTIVE" : "INACTIVE",
          };
          setSelectedProduct(updated);
          return updated;
        })
      );

      showToast(`Đã cập nhật ${checkedVariantIds.size} phiên bản!`, "success");
      setIsBulkEditOpen(false);
      setCheckedVariantIds(new Set());
    } catch (err) {
      console.error("Lỗi khi cập nhật giá hàng loạt:", err);
      showToast("Cập nhật giá hàng loạt thất bại", "error");
    }
  };



  const isVariantFormUnchanged = () => {
    if (!selectedVariant) return true;
    return (
      variantForm.sku === selectedVariant.sku &&
      variantForm.importPrice === String(selectedVariant.importPrice) &&
      variantForm.salePrice === String(selectedVariant.salePrice) &&
      variantForm.option1Value === (selectedVariant.option1Value || "") &&
      variantForm.option2Value === (selectedVariant.option2Value || "") &&
      variantForm.option3Value === (selectedVariant.option3Value || "") &&
      variantForm.status === (selectedVariant.status?.toUpperCase() === "ACTIVE" ? "ACTIVE" : "INACTIVE") &&
      Number(variantForm.stock) === selectedVariant.stock
    );
  };

  const renderVariantEditForm = () => {
    // option1/2/3Name quyết định thuộc tính nào có mặt — render động, không hardcode tên
    const optionSlots = [
      { key: "option1Value" as const, name: selectedProduct?.option1Name },
      { key: "option2Value" as const, name: selectedProduct?.option2Name },
      { key: "option3Value" as const, name: selectedProduct?.option3Name },
    ].filter((slot) => !!slot.name);

    // Kiểm tra xem số lượng có thay đổi không để hiển thị ô lý do
    const stockChanged =
      selectedVariant !== null &&
      Number(variantForm.stock) !== selectedVariant?.stock;

    return (
      <div className={styles.form}>
        <div className={styles.formGrid}>

          <Input
            id="var-importPrice"
            label="Giá nhập"
            required
            type="text"
            suffix="VND"
            value={formatInputNumber(variantForm.importPrice)}
            onChange={(e) => {
              const rawVal = e.target.value
                .replace(/\./g, "")
                .replace(/[^0-9]/g, "");
              setVariantForm((prev) => ({ ...prev, importPrice: rawVal }));
              if (errors.importPrice)
                setErrors((prev) => ({ ...prev, importPrice: "" }));
            }}
            error={errors.importPrice}
            placeholder="0"
          />

          <Input
            id="var-salePrice"
            label="Giá bán"
            required
            type="text"
            suffix="VND"
            value={formatInputNumber(variantForm.salePrice)}
            onChange={(e) => {
              const rawVal = e.target.value
                .replace(/\./g, "")
                .replace(/[^0-9]/g, "");
              setVariantForm((prev) => ({ ...prev, salePrice: rawVal }));
              if (errors.salePrice)
                setErrors((prev) => ({ ...prev, salePrice: "" }));
            }}
            error={errors.salePrice}
            placeholder="0"
          />

          <Input
            id="var-stock"
            label="Số lượng tồn kho"
            required
            type="text"
            suffix="SP"
            value={variantForm.stock}
            onChange={(e) => {
              const rawVal = e.target.value.replace(/[^0-9]/g, "");
              setVariantForm((prev) => ({ ...prev, stock: rawVal, adjustReason: "" }));
              if (errors.stock)
                setErrors((prev) => ({ ...prev, stock: "", adjustReason: "" }));
            }}
            error={errors.stock}
            placeholder="0"
          />

          {/* Render động các input thuộc tính theo đúng option name của sản phẩm */}
          {optionSlots.map(({ key, name }) => (
            <Input
              key={key}
              id={`var-${key}`}
              label={name!}
              value={variantForm[key]}
              onChange={(e) =>
                setVariantForm((prev) => ({ ...prev, [key]: e.target.value }))
              }
              placeholder={`Nhập ${name}`}
            />
          ))}

          <Select
            id="var-status"
            label="Trạng thái"
            required
            options={[
              { value: "ACTIVE", label: "Đang bán" },
              { value: "INACTIVE", label: "Ngừng bán" },
            ]}
            value={variantForm.status}
            onChange={(e) =>
              setVariantForm((prev) => ({ ...prev, status: e.target.value }))
            }
          />
        </div>

        {/* Hiển thị ô lý do điều chỉnh khi và chỉ khi số lượng thay đổi */}
        {stockChanged && (
          <Input
            id="var-adjustReason"
            label="Lý do thay đổi số lượng"
            required
            type="text"
            value={variantForm.adjustReason}
            onChange={(e) => {
              setVariantForm((prev) => ({ ...prev, adjustReason: e.target.value }));
              if (errors.adjustReason)
                setErrors((prev) => ({ ...prev, adjustReason: "" }));
            }}
            error={errors.adjustReason}
            placeholder="Nhập lý do điều chỉnh số lượng tồn kho..."
          />
        )}
      </div>
    );
  };

  const renderEditForm = () => (
    <div className={styles.form}>
      <div className={styles.formGrid}>
        <Input
          id="name"
          label="Tên sản phẩm"
          required
          value={form.name}
          onChange={handleChange("name")}
          error={errors.name}
          placeholder="Nhập tên sản phẩm"
        />
        <Select
          id="category"
          label="Danh mục"
          required
          options={formCategoryOptions}
          value={form.category}
          onChange={handleChange("category")}
          error={errors.category}
        />
        <Input
          id="brand"
          label="Thương hiệu"
          value={form.brand}
          onChange={handleChange("brand")}
          placeholder="Nhập thương hiệu"
        />
        <Input
          id="unit"
          label="Đơn vị tính"
          required
          value={form.unit}
          onChange={handleChange("unit")}
          error={errors.unit}
          placeholder="VD: Cái, Bộ, Đôi..."
        />
        <Select
          id="status"
          label="Trạng thái"
          required
          options={[
            { value: "ACTIVE", label: "Đang bán" },
            { value: "INACTIVE", label: "Ngừng bán" },
          ]}
          value={form.status}
          onChange={handleChange("status")}
        />
        {attributes.length === 0 && (
          <>
            <Input
              id="importPrice"
              label="Giá nhập"
              required
              value={formatInputNumber(form.importPrice)}
              onChange={(e) => {
                const rawVal = e.target.value.replace(/\./g, "");
                setForm((prev) => ({ ...prev, importPrice: rawVal }));
                if (errors.importPrice)
                  setErrors((prev) => ({ ...prev, importPrice: "" }));
              }}
              error={errors.importPrice}
              placeholder="0"
              suffix="đ"
            />
            <Input
              id="salePrice"
              label="Giá bán"
              required
              value={formatInputNumber(form.salePrice)}
              onChange={(e) => {
                const rawVal = e.target.value.replace(/\./g, "");
                setForm((prev) => ({ ...prev, salePrice: rawVal }));
                if (errors.salePrice)
                  setErrors((prev) => ({ ...prev, salePrice: "" }));
              }}
              error={errors.salePrice}
              placeholder="0"
              suffix="đ"
            />
          </>
        )}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="description" className={styles.label}>
          Mô tả sản phẩm
        </label>
        <textarea
          id="description"
          className={styles.textarea}
          rows={4}
          value={form.description}
          onChange={handleChange("description")}
          placeholder="Nhập mô tả sản phẩm..."
          maxLength={1000}
        />
      </div>

      <div style={{ marginTop: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h4 style={{ fontWeight: 600, fontSize: "var(--font-md)" }}>Thuộc tính sản phẩm</h4>
          {attributes.length < 3 && (
            <Button
              variant="secondary"
              size="sm"
              icon="fi fi-rr-add"
              onClick={addAttribute}
              type="button"
            >
              Thêm thuộc tính
            </Button>
          )}
        </div>

        {attributes.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "16px",
              color: "var(--color-subtext)",
              fontSize: "var(--font-sm)",
              backgroundColor: "var(--color-bg)",
              border: "1px dashed var(--color-border)",
              borderRadius: "var(--radius-md)"
            }}
          >
            Sản phẩm này chưa có thuộc tính (VD: kích thước, màu sắc). Nhấp "Thêm thuộc tính" để cấu hình.
          </div>
        ) : (
          <div className={styles.attrList}>
            {attributes.map((attr, index) => (
              <div key={index} className={styles.attrRow}>
                <div className={styles.attrNameGroup}>
                  <Input
                    id={`attr-name-${index}`}
                    label={`Tên thuộc tính ${index + 1}`}
                    placeholder="VD: Màu sắc, Kích thước..."
                    value={attr.name}
                    onChange={(e) =>
                      updateAttributeName(index, e.target.value)
                    }
                  />
                </div>
                <div className={styles.attrValueGroup}>
                  <label className={styles.label}>
                    Giá trị thuộc tính
                  </label>
                  <div
                    className={styles.tagsInputWrapper}
                    onClick={() =>
                      document
                        .getElementById(`attr-input-${index}`)
                        ?.focus()
                    }
                  >
                    {attr.values.map((val, valIdx) => (
                      <span key={valIdx} className={styles.tag}>
                        {val}
                        <button
                          type="button"
                          onClick={() =>
                            removeAttributeValue(index, valIdx)
                          }
                          aria-label="Xóa"
                        >
                          <i className="fi fi-rr-cross-small" />
                        </button>
                      </span>
                    ))}
                    <input
                      id={`attr-input-${index}`}
                      type="text"
                      className={styles.tagInput}
                      placeholder={
                        attr.values.length === 0
                          ? "Nhập giá trị..."
                          : "Thêm..."
                      }
                      value={tagInputs[index]}
                      onChange={(e) =>
                        updateTagInput(index, e.target.value)
                      }
                      onKeyDown={(e) => handleTagKeyDown(e, index)}
                      onBlur={() => handleTagBlur(index)}
                    />
                  </div>
                </div>
                <div className={styles.attrDeleteGroup}>
                  <Button
                    variant="danger"
                    onClick={() => removeAttribute(index)}
                    icon="fi fi-rr-trash"
                    type="button"
                  >
                    Xóa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {visibleVariants.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <h4 style={{ fontWeight: 600, fontSize: "var(--font-md)", marginBottom: "8px" }}>
            Danh sách biến thể ({visibleVariants.length})
          </h4>
          <div className={styles.variantsTableWrapper}>
            <table className={styles.variantsTable}>
              <thead>
                <tr>
                  <th className={styles.colStt}>STT</th>
                  {attributes
                    .filter((a) => a.name.trim() && a.values.length > 0)
                    .map((a, i) => (
                      <th key={i}>{a.name}</th>
                    ))}
                  <th className={styles.colPrice}>Giá nhập</th>
                  <th className={styles.colPrice}>Giá bán</th>
                  <th style={{ textAlign: "center", width: "100px" }}>Tồn kho</th>
                  <th className={styles.colActions}>Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {visibleVariants.map((v: VariantRow, idx: number) => {
                  const override = variantPriceOverrides[v.label];
                  const displayImport =
                    override?.importPrice || form.importPrice;
                  const displaySale =
                    override?.salePrice || form.salePrice;
                  const isEditing = editingVariantLabel === v.label;

                  const opt1Val = v.values[0] || "";
                  const opt2Val = v.values[1] || "";
                  const opt3Val = v.values[2] || "";

                  const existing = selectedProduct?.variants.find(
                    (vrt) =>
                      (opt1Val ? vrt.option1Value === opt1Val : !vrt.option1Value) &&
                      (opt2Val ? vrt.option2Value === opt2Val : !vrt.option2Value) &&
                      (opt3Val ? vrt.option3Value === opt3Val : !vrt.option3Value)
                  );
                  const stock = existing?.stock || 0;
                  const hasTransactions = existing?.hasTransactions || false;
                  return (
                    <tr
                      key={v.label}
                      className={
                        isEditing ? styles.variantRowEditing : ""
                      }
                    >
                      <td className={styles.variantIndex}>{idx + 1}</td>
                      {v.values.map((val: string, vi: number) => (
                        <td key={vi}>
                          <span className={styles.variantTag}>
                            {val}
                          </span>
                        </td>
                      ))}
                      <td className={styles.colPrice}>
                        {isEditing ? (
                          <input
                            className={styles.priceInput}
                            type="text"
                            value={formatInputNumber(
                              editingPrices.importPrice,
                            )}
                            onChange={(e) => {
                              const raw = e.target.value
                                .replace(/\./g, "")
                                .replace(/[^0-9]/g, "");
                              setEditingPrices((p) => ({
                                ...p,
                                importPrice: raw,
                              }));
                            }}
                            placeholder="0"
                          />
                        ) : (
                          <span
                            className={
                              override?.importPrice
                                ? styles.priceOverride
                                : ""
                            }
                          >
                            {displayImport
                              ? new Intl.NumberFormat("vi-VN").format(
                                Number(displayImport),
                              ) + " VND"
                              : "—"}
                          </span>
                        )}
                      </td>
                      <td className={styles.colPrice}>
                        {isEditing ? (
                          <input
                            className={styles.priceInput}
                            type="text"
                            value={formatInputNumber(
                              editingPrices.salePrice,
                            )}
                            onChange={(e) => {
                              const raw = e.target.value
                                .replace(/\./g, "")
                                .replace(/[^0-9]/g, "");
                              setEditingPrices((p) => ({
                                ...p,
                                salePrice: raw,
                              }));
                            }}
                            placeholder="0"
                          />
                        ) : (
                          <span
                            className={
                              override?.salePrice
                                ? styles.priceOverride
                                : ""
                            }
                          >
                            {displaySale
                              ? new Intl.NumberFormat("vi-VN").format(
                                Number(displaySale),
                              ) + " VND"
                              : "—"}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={[
                            styles.variantStockBadge,
                            stock < 20 ? styles.variantLowStock : "",
                          ].join(" ")}
                        >
                          {stock}
                        </span>
                      </td>
                      <td className={styles.colActions}>
                        {isEditing ? (
                          <div className={styles.actionBtns}>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => confirmEditVariant(v.label)}
                              title="Lưu"
                            >
                              <i className="fi fi-rr-check" />
                            </button>
                            <button
                              type="button"
                              className={[styles.actionBtn, styles.actionBtnDanger].join(" ")}
                              onClick={cancelEditVariant}
                              title="Hủy"
                            >
                              <i className="fi fi-rr-cross" />
                            </button>
                          </div>
                        ) : (
                          <div className={styles.actionBtns}>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => startEditVariant(v)}
                              title="Sửa giá"
                            >
                              <i className="fi fi-rr-edit" />
                            </button>
                            <button
                              type="button"
                              className={[styles.actionBtn, styles.actionBtnDanger].join(" ")}
                              onClick={() => {
                                if (hasTransactions) {
                                  showToast("Không thể xóa phiên bản này vì đã tồn tại hóa đơn nhập hàng!", "warning");
                                } else {
                                  removeVariant(v.label);
                                }
                              }}
                              title="Xóa biến thể"
                            >
                              <i className="fi fi-rr-trash" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const columns: TableColumn<Product>[] = [
    {
      key: "code",
      label: "Mã sản phẩm",
      width: "140px",
      render: (val) => <code className={styles.sku}>{val as string}</code>,
    },
    {
      key: "image",
      label: "Hình ảnh",
      width: "80px",
      align: "center",
      render: () => (
        <div className={styles.imgThumb}>
          <i className="fi fi-rr-shirt" aria-hidden />
        </div>
      ),
    },
    { key: "name", label: buildSortHeader("Tên sản phẩm", "name") },
    { key: "categoryLabel", label: "Danh mục", width: "140px" },
    {
      key: "brand",
      label: buildSortHeader("Thương hiệu", "brand"),
      width: "140px",
      render: (val) => (val as string) || "—",
    },
    {
      key: "stock",
      label: "Tồn kho",
      align: "center",
      width: "120px",
      render: (val) => (
        <span
          className={[
            styles.stockBadge,
            (val as number) < 20 ? styles.lowStock : "",
          ].join(" ")}
        >
          {val as number}
        </span>
      ),
    },
    {
      key: "status",
      label: "Trạng thái",
      width: "120px",
      align: "center",
      render: (val) => {
        const statusStr = String(val).toUpperCase();
        const isActive = statusStr === "ACTIVE";
        return (
          <span
            className={[
              styles.statusBadge,
              isActive ? styles.statusActive : styles.statusInactive,
            ].join(" ")}
          >
            {isActive ? "Đang bán" : "Ngừng bán"}
          </span>
        );
      },
    },
    {
      key: "id",
      label: "Hành động",
      width: "180px",
      align: "center",
      render: (_, row) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          <Button
            variant="ghost"
            size="sm"
            icon="fi fi-rr-eye"
            onClick={() => openDetail(row)}
          >
            Xem
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon="fi fi-rr-trash"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteProductId(row.id);
            }}
          >
            Xóa
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
            <h2 className={styles.title}>Danh sách sản phẩm</h2>
            <p className={styles.subtitle}>{displayProducts.length} sản phẩm</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", maxWidth: "480px" }}>
          <Select
            id="categoryFilter"
            options={categoryOptions}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          />
          <Select
            id="statusFilter"
            options={[
              { value: "", label: "Tất cả trạng thái" },
              { value: "ACTIVE", label: "Đang bán" },
              { value: "INACTIVE", label: "Ngừng bán" },
            ]}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <Card>
          <CardHeader
            title="Tất cả sản phẩm"
            actions={
              <SearchBox
                placeholder="Tìm SKU, tên sản phẩm..."
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
              data={displayProducts}
              rowKey="id"
              loading={loading}
              emptyText="Không tìm thấy sản phẩm"
            />
            {totalElements > 0 && (
              <div className={styles.paginationWrap}>
                <Pagination
                  pagination={{
                    page: currentPage,
                    pageSize: pageSize,
                    total: totalElements,
                  }}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        isOpen={!!selectedProduct && !isEditOpen}
        onClose={() => setSelectedProduct(null)}
        title="Chi tiết sản phẩm"
        size="xl"
      >
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
                "Ngày cập nhật": formatDateTime(
                  selectedProduct.updatedAt || selectedProduct.createdAt
                ),
                "Mô tả": selectedProduct.description || "—",
              }).map(([k, v]) => {
                const isFullWidth = k === "Mô tả";
                return (
                  <div
                    key={k}
                    className={[
                      styles.detailRow,
                      isFullWidth ? styles.detailRowFullWidth : "",
                    ].join(" ")}
                  >
                    <span className={styles.detailKey}>{k}</span>
                    <span className={styles.detailVal}>{v}</span>
                  </div>
                );
              })}
            </div>

            {selectedProduct.variants &&
              selectedProduct.variants.length > 0 && (
                <div className={styles.variantsSection}>
                  <div className={styles.variantsTitleRow}>
                    <h4 className={styles.variantsTitle}>
                      Danh sách phiên bản ({selectedProduct.variants.length})
                    </h4>
                    <div
                      className={[
                        styles.bulkToolbar,
                        checkedVariantIds.size > 0
                          ? styles.bulkToolbarVisible
                          : "",
                      ].join(" ")}
                    >
                      <span className={styles.bulkCount}>
                        {checkedVariantIds.size} đã chọn
                      </span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Button
                          size="sm"
                          icon="fi fi-rr-edit"
                          onClick={openBulkEdit}
                        >
                          Chỉnh sửa hàng loạt
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon="fi fi-rr-trash"
                          onClick={() => {
                            setIsBulkDeleteConfirmOpen(true);
                          }}
                        >
                          Xóa hàng loạt
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className={styles.variantsTableWrapper}>
                    <table className={styles.variantsTable}>
                      <thead>
                        <tr>
                          <th style={{ width: "40px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              className={styles.variantCheckbox}
                              checked={
                                checkedVariantIds.size ===
                                selectedProduct.variants.length &&
                                selectedProduct.variants.length > 0
                              }
                              ref={(el) => {
                                if (el)
                                  el.indeterminate =
                                    checkedVariantIds.size > 0 &&
                                    checkedVariantIds.size <
                                    selectedProduct.variants.length;
                              }}
                              onChange={() =>
                                toggleAllVariants(selectedProduct.variants)
                              }
                              title="Chọn tất cả"
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
                          <th style={{ textAlign: "center", width: "90px" }}>
                            Hành động
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProduct.variants.map((v) => (
                          <tr
                            key={v.id}
                            className={
                              checkedVariantIds.has(v.id)
                                ? styles.variantRowChecked
                                : ""
                            }
                          >
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                className={styles.variantCheckbox}
                                checked={checkedVariantIds.has(v.id)}
                                onChange={() => toggleVariantCheck(v.id)}
                              />
                            </td>
                            <td>
                              <code>{v.sku}</code>
                            </td>
                            {selectedProduct.option1Name && <td>{v.option1Value || "—"}</td>}
                            {selectedProduct.option2Name && <td>{v.option2Value || "—"}</td>}
                            {selectedProduct.option3Name && <td>{v.option3Value || "—"}</td>}
                            <td style={{ textAlign: "right" }}>
                              {formatCurrency(v.importPrice)}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {formatCurrency(v.salePrice)}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span
                                className={[
                                  styles.variantStockBadge,
                                  v.stock < 20 ? styles.variantLowStock : "",
                                ].join(" ")}
                              >
                                {v.stock}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span
                                className={[
                                  styles.statusBadge,
                                  v.status?.toUpperCase() === "ACTIVE" ? styles.statusActive : styles.statusInactive,
                                ].join(" ")}
                              >
                                {v.status?.toUpperCase() === "ACTIVE" ? "Đang bán" : "Ngừng bán"}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon="fi fi-rr-eye"
                                  onClick={() => setSelectedVariant(v)}
                                >
                                  Xem
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  icon="fi fi-rr-trash"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (v.status?.toUpperCase() !== 'ACTIVE') {
                                      showToast("Sản phẩm đã ngừng bán!", "error");
                                    } else if (v.hasTransactions) {
                                      showToast(`Không thể xóa phiên bản SKU ${v.sku} vì đã tồn tại hóa đơn nhập hàng!`, "warning");
                                    } else {
                                      setDeleteVariantId(v.id);
                                    }
                                  }}
                                >
                                  Xóa
                                </Button>
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
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedProduct(null);
                  resetChecked();
                }}
              >
                Đóng
              </Button>
              <Button
                variant="secondary"
                icon="fi fi-rr-edit"
                onClick={() => handleEdit(selectedProduct)}
              >
                Chỉnh sửa
              </Button>
            </div>
          </>
        )}
      </Modal>

      {
        // Modal sửa hàng loạt
      }
      <Modal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        title={`Chỉnh sửa hàng loạt (${checkedVariantIds.size} phiên bản)`}
        size="md"
      >
        <div className={styles.form}>
          <p className={styles.bulkHint}>
            Chỉ điền trường bạn muốn thay đổi. Trường để trống sẽ giữ nguyên giá
            trị cũ.
          </p>
          <div className={styles.formGrid}>
            <Input
              id="bulk-importPrice"
              label="Giá nhập"
              type="text"
              suffix="VND"
              value={formatInputNumber(bulkForm.importPrice)}
              onChange={(e) => {
                const raw = e.target.value
                  .replace(/\./g, "")
                  .replace(/[^0-9]/g, "");
                setBulkForm((p) => ({ ...p, importPrice: raw }));
                if (bulkErrors.importPrice)
                  setBulkErrors((p) => ({ ...p, importPrice: "" }));
              }}
              error={bulkErrors.importPrice}
              placeholder="0"
            />
            <Input
              id="bulk-salePrice"
              label="Giá bán"
              type="text"
              suffix="VND"
              value={formatInputNumber(bulkForm.salePrice)}
              onChange={(e) => {
                const raw = e.target.value
                  .replace(/\./g, "")
                  .replace(/[^0-9]/g, "");
                setBulkForm((p) => ({ ...p, salePrice: raw }));
                if (bulkErrors.salePrice)
                  setBulkErrors((p) => ({ ...p, salePrice: "" }));
              }}
              error={bulkErrors.salePrice}
              placeholder="0"
            />
            <Select
              id="bulk-status"
              label="Trạng thái"
              options={[
                { value: "", label: "Giữ nguyên" },
                { value: "ACTIVE", label: "Đang bán" },
                { value: "INACTIVE", label: "Ngừng bán" },
              ]}
              value={bulkForm.status}
              onChange={(e) =>
                setBulkForm((p) => ({ ...p, status: e.target.value }))
              }
            />
          </div>
        </div>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setIsBulkEditOpen(false)}>
            Hủy
          </Button>
          <Button icon="fi fi-rr-check" onClick={handleBulkSave}>
            Áp dụng
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isEditOpen}
        onClose={closeAllModals}
        title={`Chỉnh sửa sản phẩm: ${selectedProduct?.name ?? ""}`}
        size="xxl"
      >
        {renderEditForm()}
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={closeAllModals}>
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            icon="fi fi-rr-check"
            disabled={isFormUnchanged()}
          >
            Lưu thay đổi
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!selectedVariant && !isVariantEditOpen}
        onClose={closeVariantModals}
        title="Chi tiết phiên bản sản phẩm"
        size="xl"
      >
        {selectedVariant && selectedProduct && (
          <>
            {/* Tab navigation */}
            <div className={styles.tabNav}>
              <button
                className={[styles.tabBtn, activeVariantTab === "info" ? styles.tabBtnActive : ""].join(" ")}
                onClick={() => setActiveVariantTab("info")}
                type="button"
              >
                <i className="fi fi-rr-info" />
                Thông tin
              </button>
              <button
                className={[styles.tabBtn, activeVariantTab === "history" ? styles.tabBtnActive : ""].join(" ")}
                onClick={() => {
                  setActiveVariantTab("history");
                  if (txHistory.length === 0) {
                    fetchTxHistory(selectedVariant.id, 1);
                  }
                }}
                type="button"
              >
                <i className="fi fi-rr-time-past" />
                Lịch sử giao dịch
              </button>
            </div>

            {/* Tab: Thông tin chung */}
            {activeVariantTab === "info" && (
              <div className={styles.detail}>
                {(() => {
                  // Xây dựng danh sách thuộc tính động theo đúng option name của sản phẩm
                  const attrRows: { key: string; value: string | number; isFullWidth: boolean }[] = [
                    { key: "Tên sản phẩm", value: selectedProduct.name, isFullWidth: true },
                    { key: "Mã SKU", value: selectedVariant.sku, isFullWidth: false },
                  ];

                  // Chỉ thêm các thuộc tính mà sản phẩm thực sự có
                  if (selectedProduct.option1Name) {
                    attrRows.push({
                      key: selectedProduct.option1Name,
                      value: selectedVariant.option1Value || "—",
                      isFullWidth: false,
                    });
                  }
                  if (selectedProduct.option2Name) {
                    attrRows.push({
                      key: selectedProduct.option2Name,
                      value: selectedVariant.option2Value || "—",
                      isFullWidth: false,
                    });
                  }
                  if (selectedProduct.option3Name) {
                    attrRows.push({
                      key: selectedProduct.option3Name,
                      value: selectedVariant.option3Value || "—",
                      isFullWidth: false,
                    });
                  }

                  attrRows.push(
                    { key: "Giá nhập", value: formatCurrency(selectedVariant.importPrice), isFullWidth: false },
                    { key: "Giá bán", value: formatCurrency(selectedVariant.salePrice), isFullWidth: false },
                    { key: "Tồn kho", value: selectedVariant.stock, isFullWidth: false },
                    { key: "Ghi chú", value: selectedVariant.note || "—", isFullWidth: true },
                  );

                  return attrRows.map(({ key, value, isFullWidth }) => (
                    <div
                      key={key}
                      className={[
                        styles.detailRow,
                        isFullWidth ? styles.detailRowFullWidth : "",
                      ].join(" ")}
                    >
                      <span className={styles.detailKey}>{key}</span>
                      <span className={styles.detailVal}>{value}</span>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* Tab: Lịch sử giao dịch kho */}
            {activeVariantTab === "history" && (
              <div>
                {txLoading ? (
                  <div className={styles.txLoading}>
                    <i className="fi fi-rr-spinner" style={{ marginRight: 8 }} />
                    Đang tải lịch sử giao dịch...
                  </div>
                ) : txHistory.length === 0 ? (
                  <div className={styles.txEmpty}>
                    <i className="fi fi-rr-time-past" style={{ fontSize: 24, display: "block", marginBottom: 8, opacity: 0.4 }} />
                    Chưa có giao dịch kho nào
                  </div>
                ) : (
                  <div className={styles.txTableWrapper}>
                    <table className={styles.txTable}>
                      <thead>
                        <tr>
                          <th style={{ width: "100px", textAlign: "center" }}>Loại thay đổi</th>
                          <th style={{ width: "70px", textAlign: "center" }}>SL</th>
                          <th style={{ width: "80px", textAlign: "center" }}>Trước</th>
                          <th style={{ width: "80px", textAlign: "center" }}>Sau</th>
                          <th>Ghi chú</th>
                          <th style={{ width: "140px" }}>Người tạo</th>
                          <th style={{ width: "140px" }}>Thời gian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txHistory.map((tx) => {
                          const isIN = tx.transactionType === "IN";
                          const isOUT = tx.transactionType === "OUT";
                          const badgeClass = isIN
                            ? styles.txBadgeIn
                            : isOUT
                              ? styles.txBadgeOut
                              : tx.transactionType === "ADJUSTMENT"
                                ? styles.txBadgeAdj
                                : styles.txBadgeDefault;

                          const txTypeLabel = isIN ? "Nhập kho" : isOUT ? "Xuất kho" : tx.transactionType === "ADJUSTMENT" ? "Điều chỉnh" : tx.transactionType;

                          return (
                            <tr key={tx.id}>
                              <td>
                                <span className={[styles.txBadge, badgeClass].join(" ")}>
                                  {txTypeLabel}
                                </span>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <span className={isIN ? styles.txQtyIn : isOUT ? styles.txQtyOut : styles.txQtyAdj}>
                                  {/* {isIN || tx.quantity > 0 ? "+" : isOUT ? "-" : ""}{tx.quantity} */}
                                  {isIN || tx.quantity > 0 ? "+" : ""}{tx.quantity}
                                </span>
                              </td>
                              <td style={{ textAlign: "center", color: "var(--color-subtext)" }}>
                                {tx.quantityBefore}
                              </td>
                              <td style={{ textAlign: "center", fontWeight: 600 }}>
                                {tx.quantityAfter}
                              </td>
                              <td>
                                {isIN && tx.purchaseOrderCode ? (
                                  <span>
                                    {tx.note?.replace(tx.purchaseOrderCode, "").trim().replace(/\s*$/, " ") || "Nhập theo đơn "}
                                    <button
                                      className={styles.poLink}
                                      onClick={() => handlePOLinkClick(tx.purchaseOrderCode!)}
                                      disabled={poDetailLoading}
                                      type="button"
                                      title="Xem chi tiết đơn đặt hàng"
                                    >
                                      {tx.purchaseOrderCode}
                                    </button>
                                  </span>
                                ) : (
                                  <span style={{ color: "var(--color-subtext)" }}>
                                    {tx.note || "—"}
                                  </span>
                                )}
                              </td>
                              <td style={{ color: "var(--color-subtext)" }}>
                                {tx.createdByName || String(tx.createdBy)}
                              </td>
                              <td style={{ color: "var(--color-subtext)", whiteSpace: "nowrap" }}>
                                {formatDateTime(tx.createdAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Phân trang cho bảng transaction */}
                {txTotalElements > txPageSize && (
                  <div className={styles.txPaginationWrap}>
                    <Pagination
                      pagination={{ page: txPage, pageSize: txPageSize, total: txTotalElements }}
                      onPageChange={(p) => {
                        setTxPage(p);
                        if (selectedVariant) fetchTxHistory(selectedVariant.id, p);
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={closeVariantModals}>
                Đóng
              </Button>
              <Button
                variant="secondary"
                icon="fi fi-rr-edit"
                onClick={() => handleVariantEdit(selectedVariant)}
              >
                Chỉnh sửa
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        isOpen={isVariantEditOpen}
        onClose={closeVariantModals}
        title={`Chỉnh sửa phiên bản: ${selectedVariant?.sku ?? ""}`}
        size="md"
      >
        {renderVariantEditForm()}
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={closeVariantModals}>
            Hủy
          </Button>
          <Button
            onClick={handleVariantSave}
            icon="fi fi-rr-check"
            disabled={isVariantFormUnchanged()}
          >
            Lưu thay đổi
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteProductId}
        title="Xóa sản phẩm"
        message={`Bạn có chắc chắn muốn xóa sản phẩm "${products.find((p) => p.id === deleteProductId)?.name ?? ""
          }"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        onConfirm={handleDeleteProduct}
        onCancel={() => setDeleteProductId(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteVariantId}
        title="Xóa phiên bản"
        message={`Bạn có chắc chắn muốn xóa phiên bản "${selectedProduct?.variants.find((v) => v.id === deleteVariantId)?.sku ?? ""
          }"?`}
        confirmLabel="Xóa"
        onConfirm={handleDeleteVariant}
        onCancel={() => setDeleteVariantId(null)}
      />

      <ConfirmDialog
        isOpen={isBulkDeleteConfirmOpen}
        title="Xóa hàng loạt phiên bản"
        message={`Bạn có chắc chắn muốn xóa ${checkedVariantIds.size} phiên bản đã chọn?`}
        confirmLabel="Xóa"
        onConfirm={handleBulkDelete}
        onCancel={() => setIsBulkDeleteConfirmOpen(false)}
      />

      {/* Modal chi tiết đơn đặt hàng – mở khi click link PO trong bảng giao dịch */}
      <Modal
        isOpen={!!poDetail}
        onClose={() => setPoDetail(null)}
        title="Chi tiết đơn đặt hàng"
        size="lg"
      >
        {poDetail && (
          <div className={styles.poDetailSection}>
            <div className={styles.poDetailHeader}>
              <div>
                <div className={styles.poDetailCode}>{poDetail.code}</div>
                <div style={{ color: "var(--color-subtext)", fontSize: "var(--font-sm)", marginTop: 4 }}>
                  {poDetail.supplierName}
                </div>
              </div>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 14px",
                borderRadius: "var(--radius-full)",
                fontSize: "var(--font-xs)",
                fontWeight: 600,
                backgroundColor: poDetail.status === "RECEIVED"
                  ? "var(--color-success-light)"
                  : poDetail.status === "PENDING"
                    ? "var(--color-info-light)"
                    : poDetail.status === "CANCELLED"
                      ? "var(--color-danger-light)"
                      : "var(--color-hover)",
                color: poDetail.status === "RECEIVED"
                  ? "var(--color-success)"
                  : poDetail.status === "PENDING"
                    ? "var(--color-primary)"
                    : poDetail.status === "CANCELLED"
                      ? "var(--color-danger)"
                      : "var(--color-subtext)",
              }}>
                {poDetail.status === "DRAFT" ? "Nháp"
                  : poDetail.status === "PENDING" ? "Chờ nhập"
                    : poDetail.status === "RECEIVED" ? "Đã nhận hàng"
                      : poDetail.status === "CANCELLED" ? "Đã huỷ"
                        : poDetail.status}
              </span>
            </div>

            <div className={styles.poDetailMeta}>
              <span>
                <i className="fi fi-rr-calendar" />
                Ngày đặt: {formatDateTime(poDetail.orderDate)}
              </span>
              {poDetail.receivedDate && (
                <span>
                  <i className="fi fi-rr-box-check" />
                  Ngày nhận: {formatDateTime(poDetail.receivedDate)}
                </span>
              )}
              <span>
                <i className="fi fi-rr-user" />
                Người tạo: {poDetail.createdByName}
              </span>
              {poDetail.note && (
                <span>
                  <i className="fi fi-rr-note" />
                  Ghi chú: {poDetail.note}
                </span>
              )}
            </div>

            <div className={styles.variantsTableWrapper}>
              <table className={styles.variantsTable}>
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th style={{ width: 60, textAlign: "center" }}>SL</th>
                    <th style={{ width: 130, textAlign: "right" }}>Đơn giá</th>
                    <th style={{ width: 130, textAlign: "right" }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {poDetail.details.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: "0.85rem" }}>
                          {item.productName}
                          {[item.option1Value, item.option2Value, item.option3Value]
                            .filter(Boolean).join(" / ")
                            ? ` – ${[item.option1Value, item.option2Value, item.option3Value].filter(Boolean).join(" / ")}`
                            : ""}
                        </div>
                        <div style={{ color: "var(--color-subtext)", fontSize: "0.75rem", marginTop: 2 }}>
                          {item.sku}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>{item.quantity}</td>
                      <td style={{ textAlign: "right" }}>{formatCurrency(item.unitPrice)}</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: "var(--color-primary)" }}>
                        {formatCurrency(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "var(--space-3)", borderTop: "1px solid var(--color-border)" }}>
              <span style={{ fontWeight: 600, color: "var(--color-text)" }}>Tổng tiền:</span>
              <span style={{ fontWeight: 700, fontSize: "var(--font-lg)", color: "var(--color-primary)" }}>
                {formatCurrency(poDetail.totalAmount)}
              </span>
            </div>

            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setPoDetail(null)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
