import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { ProductFormData } from "../../../types/product.types";
import { Input } from "../../../components/Input/Input";
import { Button } from "../../../components/Button/Button";
import { Card, CardHeader, CardBody } from "../../../components/Card/Card";
import { validate, isRequired, isPositiveNumber } from "../../../utils/validators";
import { ROUTES } from "../../../constants/routes";
import { useToast } from "../../../components/Toast/ToastContext";
import {
  createProduct,
  getCategories,
  type CategoryResponseDto,
  type VariantCreateRequestDto,
  type ProductCreateRequestDto,
} from "../../../services/product";
import { useUnsavedChanges } from "../../../hooks/useUnsavedChanges";
import { ConfirmDialog } from "../../../components/ConfirmDialog/ConfirmDialog";
import { CategoryManagerModal } from "../../../components/CategoryManagerModal/CategoryManagerModal";
import { SearchableCategoryDropdown } from "../../../components/SearchableCategoryDropdown/SearchableCategoryDropdown";
import { ProductAttributeEditor, type ProductAttribute } from "../../../components/ProductAttributeEditor/ProductAttributeEditor";
import { VariantPreviewTable, type VariantRow } from "../../../components/VariantPreviewTable/VariantPreviewTable";
import { formatInputNumber } from "../../../utils/variantHelpers";
import styles from "./CreateProduct.module.css";

const INITIAL: ProductFormData = {
  sku: "",
  name: "",
  category: "",
  importPrice: "",
  salePrice: "",
  unit: "Cái",
  description: "",
  image: "",
  brand: "",
};

// Màn hình tạo mới sản phẩm
export function CreateProduct() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ProductFormData>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);
  const { showToast } = useToast();
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isSubmitSuccessful, setIsSubmitSuccessful] = useState(false);

  // Attributes & variants state
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [tagInputs, setTagInputs] = useState<string[]>(["", "", ""]);
  const [variantPriceOverrides, setVariantPriceOverrides] = useState<
    Record<string, { importPrice: string; salePrice: string }>
  >({});
  const [removedVariantLabels, setRemovedVariantLabels] = useState<Set<string>>(new Set());
  const [editingVariantLabel, setEditingVariantLabel] = useState<string | null>(null);
  const [editingPrices, setEditingPrices] = useState({ importPrice: "", salePrice: "" });

  // Image upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  // Unsaved changes guard
  const isDirty = useMemo(() => {
    if (isSubmitSuccessful) return false;
    return (
      form.name.trim() !== "" ||
      (form.brand || "").trim() !== "" ||
      String(form.importPrice).trim() !== "" ||
      String(form.salePrice).trim() !== "" ||
      form.description.trim() !== "" ||
      attributes.length > 0
    );
  }, [form, attributes, isSubmitSuccessful]);
  const blocker = useUnsavedChanges(isDirty);

  // ─── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    getCategories()
      .then((res) => {
        setCategories(res);
        if (res.length > 0) setForm((prev) => ({ ...prev, category: String(res[0].id) }));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (isSubmitSuccessful) navigate(ROUTES.WAREHOUSE_PRODUCTS);
  }, [isSubmitSuccessful, navigate]);

  // Giải phóng blob URL khi unmount / thay đổi
  useEffect(() => {
    return () => {
      if (imagePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  // ─── Computed ──────────────────────────────────────────────────────────────
  const previewVariants = useMemo((): VariantRow[] => {
    const activeAttrs = attributes.filter((a) => a.name.trim() && a.values.length > 0);
    if (!activeAttrs.length) return [];
    const cartesian = (arrays: string[][]): string[][] =>
      arrays.reduce<string[][]>(
        (acc, arr) => acc.flatMap((prev) => arr.map((val) => [...prev, val])),
        [[]],
      );
    return cartesian(activeAttrs.map((a) => a.values)).map((vals) => ({
      label: vals.join(" / "),
      values: vals,
    }));
  }, [attributes]);

  const visibleVariants = useMemo(
    () => previewVariants.filter((v) => !removedVariantLabels.has(v.label)),
    [previewVariants, removedVariantLabels],
  );

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleChange =
    (field: keyof ProductFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

  const handlePriceChange =
    (field: "importPrice" | "salePrice") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
      setForm((prev) => ({ ...prev, [field]: raw }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

  const startEditVariant = (v: VariantRow) => {
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
      const isImpOv = imp !== "" && imp !== String(form.importPrice);
      const isSaleOv = sale !== "" && sale !== String(form.salePrice);
      if (!isImpOv && !isSaleOv) delete next[label];
      else next[label] = { importPrice: isImpOv ? imp : "", salePrice: isSaleOv ? sale : "" };
      return next;
    });
    setEditingVariantLabel(null);
  };

  const removeVariant = (label: string) => {
    const newRemoved = new Set([...removedVariantLabels, label]);
    setRemovedVariantLabels(newRemoved);
    if (editingVariantLabel === label) setEditingVariantLabel(null);

    const remaining = previewVariants.filter((v) => !newRemoved.has(v.label));
    const activeAttrs = attributes.filter((a) => a.name.trim() && a.values.length > 0);
    const usedValueSets = activeAttrs.map(
      (_, i) => new Set(remaining.map((v) => v.values[i]).filter(Boolean)),
    );

    setAttributes((prev) => {
      let ai = 0;
      const updated = prev
        .map((attr) => {
          const isActive = attr.name.trim() && attr.values.length > 0;
          if (!isActive) return attr;
          const used = usedValueSets[ai++] ?? new Set<string>();
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

  const handleFileSelect = (file: File) => {
    setSelectedImageFile(file);
    const localUrl = URL.createObjectURL(file);
    setImagePreviewUrl(localUrl);
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset || cloudName.includes("here") || uploadPreset.includes("here")) {
      throw new Error("Chưa cấu hình Cloudinary trong tệp .env!");
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", uploadPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) throw new Error("Tải ảnh thất bại");
    return (await res.json()).secure_url;
  };

  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    if (imagePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl("");
  };

  const resetForm = () => {
    const defaultCat = categories.length > 0 ? String(categories[0].id) : "";
    setForm({ ...INITIAL, category: defaultCat });
    setAttributes([]);
    setTagInputs(["", "", ""]);
    setVariantPriceOverrides({});
    setRemovedVariantLabels(new Set());
    setEditingVariantLabel(null);
    setErrors({});
    setSelectedImageFile(null);
    if (imagePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl("");
  };

  const handleSubmit = async () => {
    const errs = validate(form as unknown as Record<string, string>, {
      name: [isRequired],
      category: [isRequired],
      unit: [isRequired],
      importPrice: [(v) => isPositiveNumber(v)],
      salePrice: [(v) => isPositiveNumber(v)],
    });
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const activeAttrs = attributes.filter((a) => a.name.trim() && a.values.length > 0);
    const defaultImport = Number(form.importPrice);
    const defaultSale = Number(form.salePrice);

    const variantsList: VariantCreateRequestDto[] =
      visibleVariants.length > 0
        ? visibleVariants.map((v) => {
            const ov = variantPriceOverrides[v.label];
            return {
              option1Value: v.values[0] || null,
              option2Value: v.values[1] || null,
              option3Value: v.values[2] || null,
              purchasePrice: ov?.importPrice ? Number(ov.importPrice) : defaultImport,
              salePrice: ov?.salePrice ? Number(ov.salePrice) : defaultSale,
            };
          })
        : [{ option1Value: null, option2Value: null, option3Value: null, purchasePrice: defaultImport, salePrice: defaultSale }];

    let imageUrl = "";
    if (selectedImageFile) {
      setUploadingImage(true);
      try { imageUrl = await uploadToCloudinary(selectedImageFile); }
      catch { showToast("Không thể tải ảnh lên!", "error"); setUploadingImage(false); return; }
    }

    const payload: ProductCreateRequestDto = {
      name: form.name,
      categoryId: Number(form.category),
      brand: form.brand || "SapoBrand",
      unit: form.unit,
      description: form.description || "",
      imageUrl: imageUrl || undefined,
      option1Name: activeAttrs[0]?.name || null,
      option2Name: activeAttrs[1]?.name || null,
      option3Name: activeAttrs[2]?.name || null,
      variants: variantsList,
    };

    try {
      await createProduct(payload);
      showToast("Tạo sản phẩm mới thành công!", "success");
      resetForm();
      setIsSubmitSuccessful(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể tạo sản phẩm. Vui lòng thử lại!";
      showToast(msg, "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleClearAll = () => {
    resetForm();
    showToast("Đã xóa trắng tất cả các trường thông tin", "success");
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <section>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Tạo sản phẩm mới</h2>
            <p className={styles.subtitle}>Thêm sản phẩm vào hệ thống kho</p>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.mainCol}>
            {/* Thông tin cơ bản */}
            <Card className={styles.visibleOverflowCard}>
              <CardHeader title="Thông tin cơ bản" />
              <CardBody>
                <div className={styles.formGrid}>
                  <Input id="name" label="Tên sản phẩm" required value={form.name} onChange={handleChange("name")} error={errors.name} placeholder="Nhập tên sản phẩm" />
                  <Input id="brand" label="Thương hiệu" value={form.brand} onChange={handleChange("brand")} placeholder="VD: SapoBrand" />
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Danh mục <span className={styles.required}>*</span>
                    </label>
                    <SearchableCategoryDropdown
                      value={form.category}
                      onChange={(val) => {
                        setForm((prev) => ({ ...prev, category: val }));
                        if (errors.category) setErrors((prev) => ({ ...prev, category: "" }));
                      }}
                      categories={categories}
                      onManageCategories={() => setShowCategoryModal(true)}
                      error={errors.category}
                    />
                    {errors.category && <span className={styles.errorText}>{errors.category}</span>}
                  </div>
                  <Input id="unit" label="Đơn vị tính" required value={form.unit} onChange={handleChange("unit")} error={errors.unit} placeholder="VD: Cái, Bộ, Đôi..." />
                  <Input id="importPrice" label="Giá nhập" required type="text" suffix="VND" value={formatInputNumber(form.importPrice)} onChange={handlePriceChange("importPrice")} error={errors.importPrice} placeholder="0" />
                  <Input id="salePrice" label="Giá bán" required type="text" suffix="VND" value={formatInputNumber(form.salePrice)} onChange={handlePriceChange("salePrice")} error={errors.salePrice} placeholder="0" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="description" className={styles.label}>Mô tả sản phẩm</label>
                  <textarea id="description" className={styles.textarea} rows={4} value={form.description} onChange={handleChange("description")} placeholder="Nhập mô tả sản phẩm..." maxLength={1000} />
                </div>
              </CardBody>
            </Card>

            {/* Thuộc tính */}
            <Card>
              <CardHeader
                title="Thuộc tính sản phẩm"
                actions={
                  attributes.length < 3 ? (
                    <Button variant="secondary" size="sm" icon="fi fi-rr-add" onClick={() => {
                      if (attributes.length >= 3) return;
                      const names = ["Màu sắc", "Kích thước", "Chất liệu"];
                      const name = names.find((n) => !attributes.some((a) => a.name === n)) || "";
                      setAttributes((prev) => [...prev, { name, values: [] }]);
                    }} type="button">
                      Thêm thuộc tính
                    </Button>
                  ) : undefined
                }
              />
              <CardBody>
                <ProductAttributeEditor
                  attributes={attributes}
                  tagInputs={tagInputs}
                  showHeader={false}
                  onAttributesChange={(attrs) => {
                    setAttributes(attrs);
                    setRemovedVariantLabels(new Set());
                  }}
                  onTagInputsChange={setTagInputs}
                />
              </CardBody>
            </Card>

            {/* Bảng biến thể */}
            {visibleVariants.length > 0 && (
              <Card>
                <CardHeader title={`Danh sách biến thể (${visibleVariants.length})`} />
                <CardBody className={styles.variantsCardBody}>
                  <VariantPreviewTable
                    variants={visibleVariants}
                    attributes={attributes}
                    defaultImportPrice={String(form.importPrice)}
                    defaultSalePrice={String(form.salePrice)}
                    variantPriceOverrides={variantPriceOverrides}
                    editingVariantLabel={editingVariantLabel}
                    editingPrices={editingPrices}
                    onStartEdit={startEditVariant}
                    onConfirmEdit={confirmEditVariant}
                    onCancelEdit={() => setEditingVariantLabel(null)}
                    onRemove={removeVariant}
                    onEditingPriceChange={(field, val) =>
                      setEditingPrices((prev) => ({ ...prev, [field]: val }))
                    }
                  />
                </CardBody>
              </Card>
            )}
          </div>

          {/* Cột phụ – hình ảnh + actions */}
          <div className={styles.sideCol}>
            <Card>
              <CardHeader title="Hình ảnh" />
              <CardBody>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                  accept="image/*"
                  style={{ display: "none" }}
                />
                {uploadingImage ? (
                  <div className={styles.imageUploadLoading}>
                    <i className="fi fi-rr-spinner spinner" style={{ animation: "spin 1s linear infinite" }} />
                    <p>Đang tải ảnh lên...</p>
                  </div>
                ) : imagePreviewUrl ? (
                  <div className={styles.imagePreviewContainer}>
                    <img src={imagePreviewUrl} alt="Sản phẩm" className={styles.imagePreview} />
                    <button type="button" className={styles.removeImageBtn} onClick={handleRemoveImage} title="Xóa ảnh">
                      <i className="fi fi-rr-trash" />
                    </button>
                  </div>
                ) : (
                  <div className={styles.imageUpload} onClick={() => fileInputRef.current?.click()} style={{ cursor: "pointer" }}>
                    <i className="fi fi-rr-picture" aria-hidden />
                    <p>Chọn hình ảnh cho sản phẩm</p>
                    <Button variant="secondary" size="sm" icon="fi fi-rr-upload" type="button">
                      Tải lên
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className={styles.actions}>
                  <Button variant="secondary" onClick={handleClearAll} icon="fi fi-rr-trash">
                    Xóa tất cả
                  </Button>
                  <Button onClick={handleSubmit} icon="fi fi-rr-check">
                    Tạo sản phẩm
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={blocker.state === "blocked"}
        title="Rời khỏi trang?"
        message="Thông tin sản phẩm đang tạo chưa được lưu. Bạn có chắc chắn muốn rời khỏi trang này?"
        confirmLabel="Rời đi"
        cancelLabel="Ở lại"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />

      <CategoryManagerModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCategoriesChanged={(updated) => {
          setCategories(updated);
          const stillExists = updated.some((c) => String(c.id) === form.category);
          if (!stillExists) {
            setForm((prev) => ({ ...prev, category: updated.length > 0 ? String(updated[0].id) : "" }));
          }
        }}
      />
    </section>
  );
}
