import { useMemo } from "react";
import type { Product, Variant } from "../../../types/product.types";
import type { CategoryResponseDto } from "../../../services/product";
import { Modal } from "../../../components/Modal/Modal";
import { Button } from "../../../components/Button/Button";
import { Input } from "../../../components/Input/Input";
import { Select } from "../../../components/Select/Select";
import { ProductAttributeEditor, type ProductAttribute } from "../../../components/ProductAttributeEditor/ProductAttributeEditor";
import { formatInputNumber } from "../../../utils/variantHelpers";
import styles from "./EditProductModal.module.css";

interface VariantRow {
  label: string;
  values: string[];
}

interface ProductForm {
  code: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  importPrice: string;
  salePrice: string;
  description: string;
  brand: string;
  status: string;
}

interface Props {
  isOpen: boolean;
  product: Product | null;
  form: ProductForm;
  errors: Record<string, string>;
  attributes: ProductAttribute[];
  tagInputs: string[];
  variantPriceOverrides: Record<string, { importPrice: string; salePrice: string }>;
  removedVariantLabels: Set<string>;
  editingVariantLabel: string | null;
  editingPrices: { importPrice: string; salePrice: string };
  categories: CategoryResponseDto[];
  onClose: () => void;
  onFormChange: (field: keyof ProductForm, value: string) => void;
  onAttributesChange: (attrs: ProductAttribute[]) => void;
  onTagInputsChange: (inputs: string[]) => void;
  onSave: () => void;
  onStartEditVariant: (v: VariantRow) => void;
  onConfirmEditVariant: (label: string) => void;
  onCancelEditVariant: () => void;
  onRemoveVariant: (label: string) => void;
  onEditingPriceChange: (field: "importPrice" | "salePrice", value: string) => void;
  isFormUnchanged: () => boolean;
  onShowToast: (msg: string, type: "warning" | "error" | "success") => void;
}

export function EditProductModal({
  isOpen,
  product,
  form,
  errors,
  attributes,
  tagInputs,
  variantPriceOverrides,
  removedVariantLabels,
  editingVariantLabel,
  editingPrices,
  categories,
  onClose,
  onFormChange,
  onAttributesChange,
  onTagInputsChange,
  onSave,
  onStartEditVariant,
  onConfirmEditVariant,
  onCancelEditVariant,
  onRemoveVariant,
  onEditingPriceChange,
  isFormUnchanged,
  onShowToast,
}: Props) {
  const categoryOptions = useMemo(
    () => categories.map((cat) => ({ value: String(cat.id), label: cat.name })),
    [categories],
  );

  // Tính danh sách variant preview từ attributes (cartesian product)
  const previewVariants = useMemo((): VariantRow[] => {
    const activeAttrs = attributes.filter((a) => a.name.trim() && a.values.length > 0);
    if (activeAttrs.length === 0) return [];
    const cartesian = (arrays: string[][]): string[][] =>
      arrays.reduce<string[][]>(
        (acc, arr) => acc.flatMap((prev) => arr.map((val) => [...prev, val])),
        [[]],
      );
    const combos = cartesian(activeAttrs.map((a) => a.values));
    return combos.map((vals) => ({ label: vals.join(" / "), values: vals }));
  }, [attributes]);

  const visibleVariants = previewVariants.filter((v) => !removedVariantLabels.has(v.label));

  const handleChange =
    (field: keyof ProductForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      onFormChange(field, e.target.value);
    };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chỉnh sửa sản phẩm: ${product?.name ?? ""}`}
      size="xxl"
    >
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
            options={categoryOptions}
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
                  const raw = e.target.value.replace(/\./g, "");
                  onFormChange("importPrice", raw);
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
                  const raw = e.target.value.replace(/\./g, "");
                  onFormChange("salePrice", raw);
                }}
                error={errors.salePrice}
                placeholder="0"
                suffix="đ"
              />
            </>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="description" className={styles.label}>Mô tả sản phẩm</label>
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

        <ProductAttributeEditor
          attributes={attributes}
          tagInputs={tagInputs}
          existingVariants={product?.variants as Variant[]}
          onAttributesChange={onAttributesChange}
          onTagInputsChange={onTagInputsChange}
          onShowToast={onShowToast}
        />

        {/* Variant preview table */}
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
                      .map((a, i) => <th key={i}>{a.name}</th>)}
                    <th className={styles.colPrice}>Giá nhập</th>
                    <th className={styles.colPrice}>Giá bán</th>
                    <th style={{ textAlign: "center", width: "100px" }}>Tồn kho</th>
                    <th className={styles.colActions}>Cập nhật</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleVariants.map((v, idx) => {
                    const override = variantPriceOverrides[v.label];
                    const displayImport = override?.importPrice || form.importPrice;
                    const displaySale = override?.salePrice || form.salePrice;
                    const isEditing = editingVariantLabel === v.label;

                    const opt1Val = v.values[0] || "";
                    const opt2Val = v.values[1] || "";
                    const opt3Val = v.values[2] || "";

                    const existing = product?.variants.find(
                      (vrt) =>
                        (opt1Val ? vrt.option1Value === opt1Val : !vrt.option1Value) &&
                        (opt2Val ? vrt.option2Value === opt2Val : !vrt.option2Value) &&
                        (opt3Val ? vrt.option3Value === opt3Val : !vrt.option3Value),
                    );
                    const stock = existing?.stock || 0;

                    return (
                      <tr key={v.label} className={isEditing ? styles.variantRowEditing : ""}>
                        <td className={styles.variantIndex}>{idx + 1}</td>
                        {v.values.map((val, vi) => (
                          <td key={vi}><span className={styles.variantTag}>{val}</span></td>
                        ))}
                        <td className={styles.colPrice}>
                          {isEditing ? (
                            <input
                              className={styles.priceInput}
                              type="text"
                              value={formatInputNumber(editingPrices.importPrice)}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
                                onEditingPriceChange("importPrice", raw);
                              }}
                              placeholder="0"
                            />
                          ) : (
                            <span className={override?.importPrice ? styles.priceOverride : ""}>
                              {displayImport ? new Intl.NumberFormat("vi-VN").format(Number(displayImport)) + " VND" : "—"}
                            </span>
                          )}
                        </td>
                        <td className={styles.colPrice}>
                          {isEditing ? (
                            <input
                              className={styles.priceInput}
                              type="text"
                              value={formatInputNumber(editingPrices.salePrice)}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
                                onEditingPriceChange("salePrice", raw);
                              }}
                              placeholder="0"
                            />
                          ) : (
                            <span className={override?.salePrice ? styles.priceOverride : ""}>
                              {displaySale ? new Intl.NumberFormat("vi-VN").format(Number(displaySale)) + " VND" : "—"}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className={[styles.variantStockBadge, stock < 20 ? styles.variantLowStock : ""].join(" ")}>
                            {stock}
                          </span>
                        </td>
                        <td className={styles.colActions}>
                          {isEditing ? (
                            <div className={styles.actionBtns}>
                              <button type="button" className={styles.actionBtn} onClick={() => onConfirmEditVariant(v.label)} title="Lưu"><i className="fi fi-rr-check" /></button>
                              <button type="button" className={[styles.actionBtn, styles.actionBtnDanger].join(" ")} onClick={onCancelEditVariant} title="Hủy"><i className="fi fi-rr-cross" /></button>
                            </div>
                          ) : (
                            <div className={styles.actionBtns}>
                              <button type="button" className={styles.actionBtn} onClick={() => onStartEditVariant(v)} title="Sửa giá"><i className="fi fi-rr-edit" /></button>
                              <button type="button" className={[styles.actionBtn, styles.actionBtnDanger].join(" ")} onClick={() => onRemoveVariant(v.label)} title="Xóa biến thể"><i className="fi fi-rr-trash" /></button>
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

      <div className={styles.modalActions}>
        <Button variant="secondary" onClick={onClose}>Hủy</Button>
        <Button onClick={onSave} icon="fi fi-rr-check" disabled={isFormUnchanged()}>
          Lưu thay đổi
        </Button>
      </div>
    </Modal>
  );
}
