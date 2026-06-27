import { useState, useEffect } from "react";
import type {
  Product,
  ProductCategory,
  Variant,
} from "../../../types/product.types";
import { PRODUCT_CATEGORY_LABELS } from "../../../constants/product";
import { Table } from "../../../components/Table/Table";
import { SearchBox } from "../../../components/SearchBox/SearchBox";
import { Pagination } from "../../../components/Pagination/Pagination";
import { Select } from "../../../components/Select/Select";
import { Card, CardHeader, CardBody } from "../../../components/Card/Card";
import type { TableColumn, SelectOption } from "../../../types/common.types";
import { formatCurrency } from "../../../utils/formatters";
import { getProductsPage } from "../../../services/product";
import { Modal } from "../../../components/Modal/Modal";
import { Button } from "../../../components/Button/Button";
import { useToast } from "../../../components/Toast/ToastContext";
import { Input } from "../../../components/Input/Input";
import {
  validate,
  isRequired,
  isPositiveNumber,
} from "../../../utils/validators";
import styles from "./ProductList.module.css";

const CATEGORY_OPTIONS: SelectOption[] = [
  { value: "", label: "Tất cả danh mục" },
  ...Object.entries(PRODUCT_CATEGORY_LABELS).map(([v, l]) => ({
    value: v,
    label: l,
  })),
];

const FORM_CATEGORY_OPTIONS = Object.entries(PRODUCT_CATEGORY_LABELS).map(
  ([v, l]) => ({ value: v, label: l }),
);

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    sku: "",
    name: "",
    category: "ao",
    unit: "Cái",
    importPrice: "",
    salePrice: "",
    description: "",
    size: "",
    color: "",
    material: "",
    brand: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [isVariantEditOpen, setIsVariantEditOpen] = useState(false);
  const [variantForm, setVariantForm] = useState({
    sku: "",
    importPrice: "",
    salePrice: "",
    size: "",
    color: "",
    material: "",
    stock: "",
    note: "",
  });

  // Trạng thái chọn nhiều
  const [checkedVariantIds, setCheckedVariantIds] = useState<Set<string>>(
    new Set(),
  );
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({ importPrice: "", salePrice: "" });
  const [bulkErrors, setBulkErrors] = useState<Record<string, string>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { showToast } = useToast();

  // Debounce tìm kiếm
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
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
  }, [currentPage, showToast, debouncedQuery]);

  // Danh sách sản phẩm đã lọc
  const displayProducts = (() => {
    if (categoryFilter) {
      return products.filter((p) => p.category === categoryFilter);
    }
    return products;
  })();

  const openDetail = (product: Product) => {
    setSelectedProduct(product);
    setCheckedVariantIds(new Set());
  };

  const handleEdit = (product: Product) => {
    setForm({
      code: product.code,
      sku: product.sku,
      name: product.name,
      category: product.category,
      unit: product.unit || "Cái",
      importPrice: String(product.importPrice),
      salePrice: String(product.salePrice),
      description: product.description || "",
      size: product.size || "",
      color: product.color || "",
      material: product.material || "",
      brand: product.brand || "",
    });
    setErrors({});
    setSelectedProduct(product);
    setIsEditOpen(true);
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

  const handleSave = () => {
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

    const updatedMapper = (p: Product) => {
      if (p.id !== selectedProduct.id) return p;
      return {
        ...p,
        code: form.code,
        sku: form.code,
        name: form.name,
        category: form.category as ProductCategory,
        categoryLabel: PRODUCT_CATEGORY_LABELS[form.category] || "",
        unit: form.unit,
        description: form.description,
        brand: form.brand || "",
        updatedAt: new Date().toISOString().split("T")[0],
      };
    };

    setProducts((prev) => prev.map(updatedMapper));

    showToast("Cập nhật sản phẩm thành công!", "success");
    closeAllModals();
  };

  const closeAllModals = () => {
    setIsEditOpen(false);
    setSelectedProduct(null);
    setErrors({});
  };

  const isFormUnchanged = () => {
    if (!selectedProduct) return true;
    return (
      form.code === selectedProduct.code &&
      form.sku === selectedProduct.sku &&
      form.name === selectedProduct.name &&
      form.category === selectedProduct.category &&
      form.unit === (selectedProduct.unit || "Cái") &&
      form.description === (selectedProduct.description || "") &&
      form.brand === (selectedProduct.brand || "")
    );
  };

  const handleVariantEdit = (variant: Variant) => {
    setVariantForm({
      sku: variant.sku,
      importPrice: String(variant.importPrice),
      salePrice: String(variant.salePrice),
      size: variant.size || "",
      color: variant.color || "",
      material: variant.material || "",
      stock: String(variant.stock),
      note: variant.note || "",
    });
    setErrors({});
    setSelectedVariant(variant);
    setIsVariantEditOpen(true);
  };

  const handleVariantSave = () => {
    const errs = validate(variantForm, {
      importPrice: [(v) => isPositiveNumber(v)],
      salePrice: [(v) => isPositiveNumber(v)],
      stock: [(v) => isPositiveNumber(v)],
      note: [isRequired],
    });

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    if (!selectedProduct || !selectedVariant) return;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== selectedProduct.id) return p;

        const updatedVariants = p.variants.map((v) => {
          if (v.id !== selectedVariant.id) return v;
          return {
            ...v,
            sku: variantForm.sku,
            importPrice: Number(variantForm.importPrice),
            salePrice: Number(variantForm.salePrice),
            size: variantForm.size || undefined,
            color: variantForm.color || undefined,
            material: variantForm.material || undefined,
            stock: Number(variantForm.stock),
            note: variantForm.note || "",
          };
        });

        const totalStock = updatedVariants.reduce((sum, v) => sum + v.stock, 0);
        const importPrices = updatedVariants.map((v) => v.importPrice);
        const salePrices = updatedVariants.map((v) => v.salePrice);
        const minImportPrice = importPrices.length
          ? Math.min(...importPrices)
          : 0;
        const minSalePrice = salePrices.length ? Math.min(...salePrices) : 0;

        const uniqueSizes = Array.from(
          new Set(updatedVariants.map((v) => v.size).filter(Boolean)),
        );
        const uniqueColors = Array.from(
          new Set(updatedVariants.map((v) => v.color).filter(Boolean)),
        );
        const uniqueMaterials = Array.from(
          new Set(updatedVariants.map((v) => v.material).filter(Boolean)),
        );

        const sizeLabel =
          uniqueSizes.length > 1 ? "Nhiều kích thước" : uniqueSizes[0] || "—";
        const colorLabel =
          uniqueColors.length > 1 ? "Nhiều màu sắc" : uniqueColors[0] || "—";
        const materialLabel =
          uniqueMaterials.length > 1
            ? "Nhiều chất liệu"
            : uniqueMaterials[0] || "—";

        const updatedProduct = {
          ...p,
          importPrice: minImportPrice,
          salePrice: minSalePrice,
          stock: totalStock,
          size: sizeLabel,
          color: colorLabel,
          material: materialLabel,
          variants: updatedVariants,
        };

        setSelectedProduct(updatedProduct);
        return updatedProduct;
      }),
    );

    showToast("Cập nhật phiên bản thành công!", "success");
    closeVariantModals();
  };

  const closeVariantModals = () => {
    setIsVariantEditOpen(false);
    setSelectedVariant(null);
    setErrors({});
  };

  // Xóa chọn khi đóng hoặc đổi sản phẩm
  const resetChecked = () => setCheckedVariantIds(new Set());

  const handleDeleteProduct = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast("Đã xóa sản phẩm", "success");
      if (selectedProduct?.id === id) {
        setSelectedProduct(null);
      }
    }
  };

  const handleDeleteVariant = (e: React.MouseEvent, variantId: string) => {
    e.stopPropagation();
    if (window.confirm("Bạn có chắc chắn muốn xóa phiên bản này?")) {
      setProducts((prev) => prev.map(p => {
        if (p.id !== selectedProduct?.id) return p;
        return {
          ...p,
          variants: p.variants.filter(v => v.id !== variantId)
        };
      }));
      setSelectedProduct(prev => prev ? {
        ...prev,
        variants: prev.variants.filter(v => v.id !== variantId)
      } : null);
      showToast("Đã xóa phiên bản", "success");
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
    setBulkForm({ importPrice: "", salePrice: "" });
    setBulkErrors({});
    setIsBulkEditOpen(true);
  };

  const handleBulkSave = () => {
    const errs: Record<string, string> = {};
    if (!bulkForm.importPrice && !bulkForm.salePrice) {
      errs.importPrice = "Vui lòng nhập ít nhất một giá để cập nhật";
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

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== selectedProduct.id) return p;
        const updatedVariants = p.variants.map((v) => {
          if (!checkedVariantIds.has(v.id)) return v;
          return {
            ...v,
            ...(newImport !== null ? { importPrice: newImport } : {}),
            ...(newSale !== null ? { salePrice: newSale } : {}),
          };
        });
        const importPrices = updatedVariants.map((v) => v.importPrice);
        const salePrices = updatedVariants.map((v) => v.salePrice);
        const updated = {
          ...p,
          importPrice: importPrices.length ? Math.min(...importPrices) : 0,
          salePrice: salePrices.length ? Math.min(...salePrices) : 0,
          variants: updatedVariants,
        };
        setSelectedProduct(updated);
        return updated;
      }),
    );

    showToast(`Đã cập nhật ${checkedVariantIds.size} phiên bản!`, "success");
    setIsBulkEditOpen(false);
    setCheckedVariantIds(new Set());
  };

  const handleBulkDelete = () => {
    if (
      window.confirm(
        `Bạn có chắc chắn muốn xóa ${checkedVariantIds.size} phiên bản đã chọn?`
      )
    ) {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== selectedProduct?.id) return p;
          const updatedVariants = p.variants.filter(
            (v) => !checkedVariantIds.has(v.id)
          );
          const importPrices = updatedVariants.map((v) => v.importPrice);
          const salePrices = updatedVariants.map((v) => v.salePrice);
          const updated = {
            ...p,
            importPrice: importPrices.length ? Math.min(...importPrices) : 0,
            salePrice: salePrices.length ? Math.min(...salePrices) : 0,
            variants: updatedVariants,
          };
          setSelectedProduct(updated);
          return updated;
        })
      );
      showToast(`Đã xóa ${checkedVariantIds.size} phiên bản`, "success");
      setCheckedVariantIds(new Set());
    }
  };

  const isVariantFormUnchanged = () => {
    if (!selectedVariant) return true;
    return (
      variantForm.sku === selectedVariant.sku &&
      variantForm.importPrice === String(selectedVariant.importPrice) &&
      variantForm.salePrice === String(selectedVariant.salePrice) &&
      variantForm.size === (selectedVariant.size || "") &&
      variantForm.color === (selectedVariant.color || "") &&
      variantForm.material === (selectedVariant.material || "") &&
      variantForm.stock === String(selectedVariant.stock) &&
      variantForm.note === (selectedVariant.note || "")
    );
  };

  const renderVariantEditForm = () => (
    <div className={styles.form}>
      <div className={styles.formGrid}>
        <Input
          id="var-stock"
          label="Tồn kho"
          required
          value={variantForm.stock}
          onChange={(e) => {
            const rawVal = e.target.value.replace(/[^0-9]/g, "");
            setVariantForm((prev) => ({ ...prev, stock: rawVal }));
            if (errors.stock) setErrors((prev) => ({ ...prev, stock: "" }));
          }}
          error={errors.stock}
          placeholder="0"
        />

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
          id="var-size"
          label="Kích thước"
          value={variantForm.size}
          onChange={(e) =>
            setVariantForm((prev) => ({ ...prev, size: e.target.value }))
          }
          placeholder="Nhập kích thước"
        />
        <Input
          id="var-color"
          label="Màu sắc"
          value={variantForm.color}
          onChange={(e) =>
            setVariantForm((prev) => ({ ...prev, color: e.target.value }))
          }
          placeholder="Nhập màu sắc"
        />
        <Input
          id="var-material"
          label="Chất liệu"
          value={variantForm.material}
          onChange={(e) =>
            setVariantForm((prev) => ({ ...prev, material: e.target.value }))
          }
          placeholder="Nhập chất liệu"
        />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="var-note" className={styles.label}>
          Ghi chú <span style={{ color: "var(--color-danger)" }}>*</span>
        </label>
        <textarea
          id="var-note"
          className={[
            styles.textarea,
            errors.note ? styles.textareaError : "",
          ].join(" ")}
          rows={3}
          value={variantForm.note}
          onChange={(e) => {
            setVariantForm((prev) => ({ ...prev, note: e.target.value }));
            if (errors.note) setErrors((prev) => ({ ...prev, note: "" }));
          }}
          placeholder="Nhập ghi chú cho phiên bản này..."
          maxLength={500}
        />
        {errors.note && <span className={styles.errorMsg}>{errors.note}</span>}
      </div>
    </div>
  );

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
          options={FORM_CATEGORY_OPTIONS}
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
    { key: "name", label: "Tên sản phẩm" },
    { key: "categoryLabel", label: "Danh mục", width: "140px" },
    {
      key: "brand",
      label: "Thương hiệu",
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
            onClick={(e) => handleDeleteProduct(e, row.id)}
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

        <Card>
          <CardHeader
            title="Tất cả sản phẩm"
            actions={
              <div className={styles.filters}>
                <Select
                  id="categoryFilter"
                  options={CATEGORY_OPTIONS}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                />
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
              </div>
            }
          />
          <CardBody className={styles.tableBody}>
            {loading ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "var(--color-subtext)",
                }}
              >
                Đang tải dữ liệu sản phẩm...
              </div>
            ) : (
              <>
                <Table
                  columns={columns}
                  data={displayProducts}
                  rowKey="id"
                  emptyText="Không tìm thấy sản phẩm"
                />
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
              </>
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
                "Ngày tạo": selectedProduct.createdAt,
                "Ngày cập nhật":
                  selectedProduct.updatedAt || selectedProduct.createdAt,
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
                          onClick={handleBulkDelete}
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
                          <th>Kích thước</th>
                          <th>Màu sắc</th>
                          <th>Chất liệu</th>
                          <th style={{ textAlign: "right" }}>Giá nhập</th>
                          <th style={{ textAlign: "right" }}>Giá bán</th>
                          <th style={{ textAlign: "center" }}>Tồn kho</th>
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
                            <td>{v.size || "—"}</td>
                            <td>{v.color || "—"}</td>
                            <td>{v.material || "—"}</td>
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
                                  onClick={(e) => handleDeleteVariant(e, v.id)}
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

      {/* Bulk edit modal */}
      <Modal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        title={`Chỉnh sửa hàng loạt (${checkedVariantIds.size} phiên bản)`}
        size="sm"
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
        size="xl"
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
        size="md"
      >
        {selectedVariant && selectedProduct && (
          <>
            <div className={styles.detail}>
              {Object.entries({
                "Tên sản phẩm": selectedProduct.name,
                "Mã SKU": selectedVariant.sku,
                "Kích thước": selectedVariant.size || "—",
                "Màu sắc": selectedVariant.color || "—",
                "Chất liệu": selectedVariant.material || "—",
                "Giá nhập": formatCurrency(selectedVariant.importPrice),
                "Giá bán": formatCurrency(selectedVariant.salePrice),
                "Tồn kho": selectedVariant.stock,
                "Ghi chú": selectedVariant.note || "—",
              }).map(([k, v]) => {
                const isFullWidth = k === "Ghi chú" || k === "Tên sản phẩm";
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
    </section>
  );
}
