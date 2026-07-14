import type { Variant } from "../../types/product.types";
import { Button } from "../Button/Button";
import { Input } from "../Input/Input";
import styles from "./ProductAttributeEditor.module.css";

export interface ProductAttribute {
  name: string;
  values: string[];
}

interface Props {
  attributes: ProductAttribute[];
  tagInputs: string[];
  /** Nếu truyền vào, sẽ kiểm tra tồn kho trước khi xóa attribute/value */
  existingVariants?: Variant[];
  /** Ẩn header nội bộ (title + nút Thêm thuộc tính) khi component cha đã tự render header riêng. Mặc định: true */
  showHeader?: boolean;
  onAttributesChange: (attrs: ProductAttribute[]) => void;
  onTagInputsChange: (inputs: string[]) => void;
  onShowToast?: (msg: string, type: "warning" | "error" | "success") => void;
}

export function ProductAttributeEditor({
  attributes,
  tagInputs,
  existingVariants,
  showHeader = true,
  onAttributesChange,
  onTagInputsChange,
  onShowToast,
}: Props) {
  // Thêm attribute mới
  const addAttribute = () => {
    if (attributes.length >= 3) return;
    const defaultNames = ["Màu sắc", "Kích thước", "Chất liệu"];
    const name =
      defaultNames.find((dName) => !attributes.some((attr) => attr.name === dName)) || "";
    onAttributesChange([...attributes, { name, values: [] }]);
  };

  // Xóa attribute
  const removeAttribute = (index: number) => {
    if (existingVariants) {
      const getOptionVal = (v: Variant) =>
        index === 0 ? v.option1Value : index === 1 ? v.option2Value : v.option3Value;
      const withStock = existingVariants.filter((v) => v.stock > 0 && !!getOptionVal(v));
      if (withStock.length > 0) {
        onShowToast?.(
          `Không thể xóa thuộc tính "${attributes[index].name}" vì có phiên bản vẫn còn tồn kho!`,
          "warning",
        );
        return;
      }
    }
    const newAttrs = attributes.filter((_, idx) => idx !== index);
    onAttributesChange(newAttrs);
    const newInputs = [...tagInputs];
    newInputs.splice(index, 1);
    newInputs.push("");
    onTagInputsChange(newInputs);
  };

  // Cập nhật tên attribute
  const updateAttributeName = (index: number, name: string) => {
    onAttributesChange(
      attributes.map((attr, idx) => (idx === index ? { ...attr, name } : attr)),
    );
  };

  // Xóa giá trị của attribute
  const removeAttributeValue = (attrIndex: number, valIndex: number) => {
    const attr = attributes[attrIndex];
    const val = attr.values[valIndex];
    if (existingVariants) {
      const getOptionVal = (v: Variant) =>
        attrIndex === 0
          ? v.option1Value
          : attrIndex === 1
            ? v.option2Value
            : attrIndex === 2
              ? v.option3Value
              : undefined;
      const withStock = existingVariants.filter(
        (v) => v.stock > 0 && getOptionVal(v)?.toLowerCase() === val.toLowerCase(),
      );
      if (withStock.length > 0) {
        onShowToast?.(`Không thể xóa giá trị "${val}" vì có phiên bản vẫn còn tồn kho!`, "warning");
        return;
      }
    }
    onAttributesChange(
      attributes.map((attr, idx) => {
        if (idx !== attrIndex) return attr;
        return { ...attr, values: attr.values.filter((_, vIdx) => vIdx !== valIndex) };
      }),
    );
  };

  // Cập nhật tag input
  const updateTagInput = (index: number, value: string) => {
    const copy = [...tagInputs];
    copy[index] = value;
    onTagInputsChange(copy);
  };

  // Commit tag input thành values
  const commitTagInput = (attrIndex: number) => {
    const value = tagInputs[attrIndex].trim();
    if (!value) return;
    const newVals = value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    onAttributesChange(
      attributes.map((attr, idx) => {
        if (idx !== attrIndex) return attr;
        const filtered = newVals.filter((v) => !attr.values.includes(v));
        return { ...attr, values: [...attr.values, ...filtered] };
      }),
    );
    const copy = [...tagInputs];
    copy[attrIndex] = "";
    onTagInputsChange(copy);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, attrIndex: number) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitTagInput(attrIndex);
    } else if (e.key === "Backspace" && !tagInputs[attrIndex]) {
      onAttributesChange(
        attributes.map((attr, idx) => {
          if (idx !== attrIndex || attr.values.length === 0) return attr;
          return { ...attr, values: attr.values.slice(0, -1) };
        }),
      );
    }
  };

  return (
    <div className={styles.container}>
      {showHeader && (
        <div className={styles.header}>
          <h4 className={styles.title}>Thuộc tính sản phẩm</h4>
          {attributes.length < 3 && (
            <Button variant="secondary" size="sm" icon="fi fi-rr-add" onClick={addAttribute} type="button">
              Thêm thuộc tính
            </Button>
          )}
        </div>
      )}

      {attributes.length === 0 ? (
        <div className={styles.emptyHint}>
          Sản phẩm này chưa có thuộc tính (VD: kích thước, màu sắc). Nhấp &ldquo;Thêm thuộc tính&rdquo; để cấu hình.
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
                  onChange={(e) => updateAttributeName(index, e.target.value)}
                />
              </div>
              <div className={styles.attrValueGroup}>
                <label className={styles.label}>Giá trị thuộc tính</label>
                <div
                  className={styles.tagsInputWrapper}
                  onClick={() => document.getElementById(`attr-input-${index}`)?.focus()}
                >
                  {attr.values.map((val, valIdx) => (
                    <span key={valIdx} className={styles.tag}>
                      {val}
                      <button
                        type="button"
                        onClick={() => removeAttributeValue(index, valIdx)}
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
                    placeholder={attr.values.length === 0 ? "Nhập giá trị..." : "Thêm..."}
                    value={tagInputs[index] ?? ""}
                    onChange={(e) => updateTagInput(index, e.target.value)}
                    onKeyDown={(e) => handleTagKeyDown(e, index)}
                    onBlur={() => commitTagInput(index)}
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
  );
}
