import { useMemo } from "react";
import type { Product } from "../../../types/product.types";
import type { PurchaseOrder } from "../../../types/purchaseOrder.types";
import { Modal } from "../../../components/Modal/Modal";
import { Button } from "../../../components/Button/Button";
import { Input } from "../../../components/Input/Input";
import { SearchableProductDropdown } from "../../../components/SearchableProductDropdown/SearchableProductDropdown";
import {
  SupplierSearchDropdown,
  type SupplierOption,
} from "../../../components/SupplierSearchDropdown/SupplierSearchDropdown";
import { formatCurrency } from "../../../utils/formatters";
import styles from "./CreateEditOrderModal.module.css";

export interface LineItem {
  _key: string;
  variantId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface Props {
  isOpen: boolean;
  title: string;
  formSupplier: SupplierOption | null;
  formNote: string;
  formLines: LineItem[];
  formSubmitting: boolean;
  products: Product[];
  editingOrder?: PurchaseOrder | null;
  onClose: () => void;
  onSupplierChange: (s: SupplierOption | null) => void;
  onNoteChange: (v: string) => void;
  onUpdateLine: (idx: number, field: keyof LineItem, val: string | number) => void;
  onAddLine: () => void;
  onRemoveLine: (idx: number) => void;
  onSave: () => void;
}

export function CreateEditOrderModal({
  isOpen, title,
  formSupplier, formNote, formLines, formSubmitting, products,
  onClose, onSupplierChange, onNoteChange, onUpdateLine, onAddLine, onRemoveLine, onSave,
}: Props) {
  const totalQty = useMemo(
    () => formLines.reduce((s, l) => s + (l.quantity || 0), 0),
    [formLines],
  );
  const totalAmount = useMemo(
    () => formLines.reduce((s, l) => s + (l.lineTotal || 0), 0),
    [formLines],
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xxl">
      {/* Form body */}
      <div className={styles.form}>
        <div className={styles.formRow}>
          <div>
            <label className={styles.label}>
              Nhà cung cấp <span className={styles.required}>*</span>
            </label>
            <SupplierSearchDropdown
              value={formSupplier}
              onSelect={onSupplierChange}
              placeholder="Tìm và chọn nhà cung cấp..."
            />
          </div>
          <Input
            id="po-note"
            label="Ghi chú"
            value={formNote}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Ghi chú thêm..."
          />
        </div>

        <div className={styles.itemsSection}>
          <div className={styles.itemsHeader}>
            <span className={styles.itemsLabel}>Danh sách hàng đặt</span>
            <Button variant="ghost" size="sm" icon="fi fi-rr-add" onClick={onAddLine}>
              Thêm dòng
            </Button>
          </div>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th style={{ width: 80 }}>SL</th>
                <th style={{ width: 140 }}>Đơn giá nhập</th>
                <th style={{ width: 130 }}>Thành tiền</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {formLines.map((line, idx) => (
                <tr key={line._key}>
                  <td>
                    <SearchableProductDropdown
                      value={line.variantId}
                      onChange={(val) => onUpdateLine(idx, "variantId", val)}
                      products={products}
                      selectedIds={formLines.filter((_, i) => i !== idx).map((l) => l.variantId).filter(Boolean)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      className={styles.lineInput}
                      value={line.quantity}
                      onChange={(e) => onUpdateLine(idx, "quantity", Number(e.target.value))}
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
                    {line.lineTotal ? formatCurrency(line.lineTotal) : "—"}
                  </td>
                  <td>
                    {formLines.length > 1 && (
                      <button className={styles.removeItemBtn} onClick={() => onRemoveLine(idx)}>
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

      {/* Footer */}
      <div className={styles.modalFooter}>
        <div className={styles.footerSummary}>
          Tổng số lượng: <strong>{totalQty}</strong>
          <span className={styles.footerDivider}>|</span>
          Tổng tiền: <strong className={styles.footerTotalAmount}>{formatCurrency(totalAmount)}</strong>
        </div>
        <Button variant="secondary" onClick={onClose} disabled={formSubmitting}>
          Huỷ
        </Button>
        <Button icon="fi fi-rr-check" onClick={onSave} disabled={formSubmitting}>
          {formSubmitting ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </Modal>
  );
}
