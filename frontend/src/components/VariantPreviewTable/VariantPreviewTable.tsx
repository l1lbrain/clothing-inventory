import { formatInputNumber } from "../../utils/variantHelpers";
import styles from "./VariantPreviewTable.module.css";

export interface VariantRow {
  label: string;
  values: string[];
}

interface Props {
  variants: VariantRow[];
  attributes: { name: string; values: string[] }[];
  defaultImportPrice: string;
  defaultSalePrice: string;
  variantPriceOverrides: Record<string, { importPrice: string; salePrice: string }>;
  editingVariantLabel: string | null;
  editingPrices: { importPrice: string; salePrice: string };
  onStartEdit: (v: VariantRow) => void;
  onConfirmEdit: (label: string) => void;
  onCancelEdit: () => void;
  onRemove: (label: string) => void;
  onEditingPriceChange: (field: "importPrice" | "salePrice", value: string) => void;
  /** Nếu truyền vào, thêm cột Tồn kho với dữ liệu từ đây */
  stockMap?: Record<string, number>;
}

export function VariantPreviewTable({
  variants,
  attributes,
  defaultImportPrice,
  defaultSalePrice,
  variantPriceOverrides,
  editingVariantLabel,
  editingPrices,
  onStartEdit,
  onConfirmEdit,
  onCancelEdit,
  onRemove,
  onEditingPriceChange,
  stockMap,
}: Props) {
  const activeAttrNames = attributes
    .filter((a) => a.name.trim() && a.values.length > 0)
    .map((a) => a.name);

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.colStt}>STT</th>
            {activeAttrNames.map((name, i) => <th key={i}>{name}</th>)}
            <th className={styles.colPrice}>Giá nhập</th>
            <th className={styles.colPrice}>Giá bán</th>
            {stockMap && <th className={styles.colStock}>Tồn kho</th>}
            <th className={styles.colActions}></th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v, idx) => {
            const override = variantPriceOverrides[v.label];
            const displayImport = override?.importPrice || defaultImportPrice;
            const displaySale = override?.salePrice || defaultSalePrice;
            const isEditing = editingVariantLabel === v.label;
            const stock = stockMap?.[v.label];

            return (
              <tr key={v.label} className={isEditing ? styles.rowEditing : ""}>
                <td className={styles.variantIndex}>{idx + 1}</td>

                {v.values.map((val, vi) => (
                  <td key={vi}>
                    <span className={styles.variantTag}>{val}</span>
                  </td>
                ))}

                {/* Giá nhập */}
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
                      {displayImport
                        ? new Intl.NumberFormat("vi-VN").format(Number(displayImport)) + " VND"
                        : "—"}
                    </span>
                  )}
                </td>

                {/* Giá bán */}
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
                      {displaySale
                        ? new Intl.NumberFormat("vi-VN").format(Number(displaySale)) + " VND"
                        : "—"}
                    </span>
                  )}
                </td>

                {/* Tồn kho (tuỳ chọn) */}
                {stockMap && (
                  <td style={{ textAlign: "center" }}>
                    <span className={[styles.stockBadge, (stock ?? 0) < 20 ? styles.stockLow : ""].join(" ")}>
                      {stock ?? 0}
                    </span>
                  </td>
                )}

                {/* Actions */}
                <td className={styles.colActions}>
                  {isEditing ? (
                    <div className={styles.actionBtns}>
                      <button type="button" className={styles.actionBtn} onClick={() => onConfirmEdit(v.label)} title="Lưu">
                        <i className="fi fi-rr-check" />
                      </button>
                      <button type="button" className={styles.actionBtn} onClick={onCancelEdit} title="Hủy">
                        <i className="fi fi-rr-cross-small" />
                      </button>
                    </div>
                  ) : (
                    <div className={styles.actionBtns}>
                      <button type="button" className={styles.actionBtn} onClick={() => onStartEdit(v)} title="Sửa giá">
                        <i className="fi fi-rr-edit" />
                      </button>
                      <button
                        type="button"
                        className={[styles.actionBtn, styles.actionBtnDanger].join(" ")}
                        onClick={() => onRemove(v.label)}
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
  );
}
