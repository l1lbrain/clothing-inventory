import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { ProductFormData } from "../../../types/product.types";
import { Input } from "../../../components/Input/Input";
import { Select } from "../../../components/Select/Select";
import { Button } from "../../../components/Button/Button";
import { Card, CardHeader, CardBody } from "../../../components/Card/Card";
import {
  validate,
  isRequired,
  isPositiveNumber,
} from "../../../utils/validators";
import { ROUTES } from "../../../constants/routes";
import { useToast } from "../../../components/Toast/ToastContext";
import {
  createProduct,
  getCategories,
  type CategoryResponseDto,
  type VariantCreateRequestDto,
  type ProductCreateRequestDto,
} from "../../../services/product";
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

interface ProductAttribute {
  name: string;
  values: string[];
}

export function CreateProduct() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ProductFormData>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);
  const { showToast } = useToast();

  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);

  useEffect(() => {
    getCategories()
      .then((res) => {
        setCategories(res);
        if (res.length > 0) {
          setForm((prev) => ({ ...prev, category: String(res[0].id) }));
        }
      })
      .catch((err) => {
        console.error("Failed to load categories:", err);
      });
  }, []);

  const categoryOptions = categories.map((cat) => ({
    value: String(cat.id),
    label: cat.name,
  }));
  const [tagInputs, setTagInputs] = useState<string[]>(["", "", ""]);

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
        // Xóa trạng thái ẩn khi thêm giá trị mới
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
      // New values added → reset removed variants so new combos all appear
      setRemovedVariantLabels(new Set());
    }
  };

  const handleChange =
    (field: keyof ProductFormData) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

  const handlePriceChange =
    (field: "importPrice" | "salePrice") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawVal = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
      setForm((prev) => ({ ...prev, [field]: rawVal }));
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

  // Tạo tổ hợp biến thể từ thuộc tính
  interface VariantRow {
    label: string;
    values: string[];
  }
  const previewVariants = useMemo((): VariantRow[] => {
    const activeAttrs = attributes.filter(
      (a) => a.name.trim() && a.values.length > 0,
    );
    if (activeAttrs.length === 0) return [];
    const cartesian = (arrays: string[][]): string[][] => {
      return arrays.reduce<string[][]>(
        (acc, arr) => acc.flatMap((prev) => arr.map((val) => [...prev, val])),
        [[]],
      );
    };
    const combos = cartesian(activeAttrs.map((a) => a.values));
    return combos.map((vals) => ({
      label: vals.join(" / "),
      values: vals,
    }));
  }, [attributes]);

  // Trạng thái giá và xóa từng biến thể
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

  const visibleVariants = previewVariants.filter(
    (v) => !removedVariantLabels.has(v.label),
  );

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

    // Biến thể còn lại sau khi xóa
    const remaining = previewVariants.filter(
      (v) => !newRemovedLabels.has(v.label),
    );

    // Các thuộc tính đang dùng
    const activeAttrs = attributes.filter(
      (a) => a.name.trim() && a.values.length > 0,
    );

    // Kiểm tra giá trị thuộc tính còn dùng
    const usedValueSets = activeAttrs.map(
      (_, attrIdx) =>
        new Set(remaining.map((v) => v.values[attrIdx]).filter(Boolean)),
    );

    // Cập nhật lại thuộc tính
    setAttributes((prev) => {
      let activeIdx = 0;
      const updated = prev
        .map((attr) => {
          const isActive = attr.name.trim() && attr.values.length > 0;
          if (!isActive) return attr; // giữ nguyên
          const used = usedValueSets[activeIdx] ?? new Set<string>();
          activeIdx++;
          return { ...attr, values: attr.values.filter((v) => used.has(v)) };
        })
        .filter((attr) => attr.values.length > 0); // xóa thuộc tính rỗng

      // Đồng bộ input với thuộc tính
      setTagInputs((ti) => {
        const next = updated.map((_, i) => ti[i] ?? "");
        // điền đủ 3 để tránh lỗi
        while (next.length < 3) next.push("");
        return next;
      });

      return updated;
    });
  };

  const handleSubmit = async () => {
    const errs = validate(form as unknown as Record<string, string>, {
      name: [isRequired],
      category: [isRequired],
      unit: [isRequired],
      importPrice: [(v) => isPositiveNumber(v)],
      salePrice: [(v) => isPositiveNumber(v)],
    });

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    const activeAttrs = attributes.filter(
      (attr) => attr.name.trim() !== "" && attr.values.length > 0,
    );
    const option1Name = activeAttrs[0] ? activeAttrs[0].name : null;
    const option2Name = activeAttrs[1] ? activeAttrs[1].name : null;
    const option3Name = activeAttrs[2] ? activeAttrs[2].name : null;

    const defaultImport = Number(form.importPrice);
    const defaultSale = Number(form.salePrice);

    // Tạo danh sách biến thể cuối
    const variantsList: VariantCreateRequestDto[] = visibleVariants.map((v) => {
      const override = variantPriceOverrides[v.label];
      const purchasePrice = override?.importPrice
        ? Number(override.importPrice)
        : defaultImport;
      const salePrice = override?.salePrice
        ? Number(override.salePrice)
        : defaultSale;
      return {
        option1Value: v.values[0] || null,
        option2Value: v.values[1] || null,
        option3Value: v.values[2] || null,
        purchasePrice,
        salePrice,
      };
    });

    // Tạo biến thể mặc định nếu không có thuộc tính
    if (variantsList.length === 0 && activeAttrs.length === 0) {
      variantsList.push({
        option1Value: null,
        option2Value: null,
        option3Value: null,
        purchasePrice: defaultImport,
        salePrice: defaultSale,
      });
    }

    const payload: ProductCreateRequestDto = {
      name: form.name,
      categoryId: Number(form.category),
      brand: form.brand || "SapoBrand",
      unit: form.unit,
      description: form.description || "",
      option1Name,
      option2Name,
      option3Name,
      variants: variantsList,
    };

    try {
      await createProduct(payload);
      showToast("Tạo sản phẩm mới thành công!", "success");
      navigate(ROUTES.WAREHOUSE_PRODUCTS);
    } catch (err) {
      console.error("Failed to create product:", err);
      const errMsg =
        err instanceof Error
          ? err.message
          : "Không thể tạo sản phẩm. Vui lòng thử lại!";
      showToast(errMsg, "error");
    }
  };

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
            <Card>
              <CardHeader title="Thông tin cơ bản" />
              <CardBody>
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
                  <Input
                    id="brand"
                    label="Thương hiệu"
                    value={form.brand}
                    onChange={handleChange("brand")}
                    error={errors.brand}
                    placeholder="VD: SapoBrand"
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
                    id="unit"
                    label="Đơn vị tính"
                    required
                    value={form.unit}
                    onChange={handleChange("unit")}
                    error={errors.unit}
                    placeholder="VD: Cái, Bộ, Đôi..."
                  />
                  <Input
                    id="importPrice"
                    label="Giá nhập"
                    required
                    type="text"
                    suffix="VND"
                    value={formatInputNumber(form.importPrice)}
                    onChange={handlePriceChange("importPrice")}
                    error={errors.importPrice}
                    placeholder="0"
                  />
                  <Input
                    id="salePrice"
                    label="Giá bán"
                    required
                    type="text"
                    suffix="VND"
                    value={formatInputNumber(form.salePrice)}
                    onChange={handlePriceChange("salePrice")}
                    error={errors.salePrice}
                    placeholder="0"
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
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Thuộc tính sản phẩm"
                actions={
                  attributes.length < 3 ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon="fi fi-rr-add"
                      onClick={addAttribute}
                      type="button"
                    >
                      Thêm thuộc tính
                    </Button>
                  ) : undefined
                }
              />
              <CardBody>
                {attributes.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px",
                      color: "var(--color-subtext)",
                      fontSize: "var(--font-base)",
                    }}
                  >
                    Sản phẩm này chưa có thuộc tính (VD: kích thước, màu sắc).
                    Nhấp "Thêm thuộc tính" để cấu hình.
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
              </CardBody>
            </Card>

            {visibleVariants.length > 0 && (
              <Card>
                <CardHeader
                  title={`Danh sách biến thể (${visibleVariants.length})`}
                />
                <CardBody className={styles.variantsCardBody}>
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
                          <th className={styles.colActions}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleVariants.map((v, idx) => {
                          const override = variantPriceOverrides[v.label];
                          const displayImport =
                            override?.importPrice || form.importPrice;
                          const displaySale =
                            override?.salePrice || form.salePrice;
                          const isEditing = editingVariantLabel === v.label;
                          return (
                            <tr
                              key={v.label}
                              className={
                                isEditing ? styles.variantRowEditing : ""
                              }
                            >
                              <td className={styles.variantIndex}>{idx + 1}</td>
                              {v.values.map((val, vi) => (
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
                                        ) + " VND"
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
                                        ) + " VND"
                                      : "—"}
                                  </span>
                                )}
                              </td>
                              <td className={styles.colActions}>
                                {isEditing ? (
                                  <div className={styles.actionBtns}>
                                    <button
                                      type="button"
                                      className={styles.actionBtn}
                                      title="Xác nhận"
                                      onClick={() =>
                                        confirmEditVariant(v.label)
                                      }
                                    >
                                      <i className="fi fi-rr-check" />
                                    </button>
                                    <button
                                      type="button"
                                      className={styles.actionBtn}
                                      title="Hủy"
                                      onClick={cancelEditVariant}
                                    >
                                      <i className="fi fi-rr-cross-small" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className={styles.actionBtns}>
                                    <button
                                      type="button"
                                      className={styles.actionBtn}
                                      title="Sửa giá"
                                      onClick={() => startEditVariant(v)}
                                    >
                                      <i className="fi fi-rr-edit" />
                                    </button>
                                    <button
                                      type="button"
                                      className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                                      title="Xóa biến thể"
                                      onClick={() => removeVariant(v.label)}
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
                </CardBody>
              </Card>
            )}
          </div>

          <div className={styles.sideCol}>
            <Card>
              <CardHeader title="Hình ảnh" />
              <CardBody>
                <div className={styles.imageUpload}>
                  <i className="fi fi-rr-picture" aria-hidden />
                  <p>Kéo thả hoặc chọn hình ảnh</p>
                  <Button variant="secondary" size="sm" icon="fi fi-rr-upload">
                    Tải lên
                  </Button>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className={styles.actions}>
                  <Button
                    variant="secondary"
                    onClick={() => navigate(-1)}
                    icon="fi fi-rr-arrow-left"
                  >
                    Hủy
                  </Button>
                  <Button onClick={handleSubmit} icon="fi fi-rr-check">
                    Lưu sản phẩm
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
