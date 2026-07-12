import type { Variant } from "../../../types/product.types";
import type { PurchaseOrder } from "../../../types/purchaseOrder.types";
import { Modal } from "../../../components/Modal/Modal";
import { Button } from "../../../components/Button/Button";
import { Input } from "../../../components/Input/Input";
import { Select } from "../../../components/Select/Select";
import { formatCurrency, formatDateTime } from "../../../utils/formatters";
import { formatInputNumber } from "../../../utils/variantHelpers";
import { ORDER_STATUS_LABEL } from "../../../constants/statusMaps";
import styles from "./EditVariantModal.module.css";

interface VariantForm {
  sku: string;
  importPrice: string;
  salePrice: string;
  option1Value: string;
  option2Value: string;
  option3Value: string;
  stock: string;
  note: string;
  adjustReason: string;
  status: string;
}

interface Props {
  isEditOpen: boolean;
  variant: Variant | null;
  product: { option1Name?: string | null; option2Name?: string | null; option3Name?: string | null; name: string } | null;
  form: VariantForm;
  errors: Record<string, string>;
  poDetail: PurchaseOrder | null;
  poDetailLoading: boolean;
  onClose: () => void;
  onFormChange: (field: keyof VariantForm, value: string) => void;
  onSave: () => void;
  onPOLinkClick: (code: string) => void;
  onPoDetailClose: () => void;
}

export function EditVariantModal({
  isEditOpen,
  variant,
  product,
  form,
  errors,
  poDetail,
  poDetailLoading,
  onClose,
  onFormChange,
  onSave,
  onPOLinkClick,
  onPoDetailClose,
}: Props) {
  const optionSlots = [
    { key: "option1Value" as const, name: product?.option1Name },
    { key: "option2Value" as const, name: product?.option2Name },
    { key: "option3Value" as const, name: product?.option3Name },
  ].filter((slot) => !!slot.name);

  const stockChanged = variant !== null && Number(form.stock) !== variant?.stock;

  return (
    <>
      {/* Modal chỉnh sửa phiên bản */}
      <Modal isOpen={isEditOpen} onClose={onClose} title={`Chỉnh sửa phiên bản: ${variant?.sku ?? ""}`} size="md">
        <div className={styles.form}>
          <div className={styles.formGrid}>
            <Input
              id="var-importPrice" label="Giá nhập" required type="text" suffix="VND"
              value={formatInputNumber(form.importPrice)}
              onChange={(e) => { const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, ""); onFormChange("importPrice", raw); }}
              error={errors.importPrice} placeholder="0"
            />
            <Input
              id="var-salePrice" label="Giá bán" required type="text" suffix="VND"
              value={formatInputNumber(form.salePrice)}
              onChange={(e) => { const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, ""); onFormChange("salePrice", raw); }}
              error={errors.salePrice} placeholder="0"
            />
            <Input
              id="var-stock" label="Số lượng tồn kho" required type="text" suffix="SP"
              value={form.stock}
              onChange={(e) => { const raw = e.target.value.replace(/[^0-9]/g, ""); onFormChange("stock", raw); }}
              error={errors.stock} placeholder="0"
            />
            {optionSlots.map(({ key, name }) => (
              <Input
                key={key} id={`var-${key}`} label={name!}
                value={form[key]}
                onChange={(e) => onFormChange(key, e.target.value)}
                placeholder={`Nhập ${name}`}
              />
            ))}
            <Select
              id="var-status" label="Trạng thái" required
              options={[{ value: "ACTIVE", label: "Đang bán" }, { value: "INACTIVE", label: "Ngừng bán" }]}
              value={form.status}
              onChange={(e) => onFormChange("status", e.target.value)}
            />
          </div>
          {stockChanged && (
            <Input
              id="var-adjustReason" label="Lý do thay đổi số lượng" required type="text"
              value={form.adjustReason}
              onChange={(e) => onFormChange("adjustReason", e.target.value)}
              error={errors.adjustReason}
              placeholder="Nhập lý do điều chỉnh số lượng tồn kho..."
            />
          )}
        </div>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button onClick={onSave} icon="fi fi-rr-check">Lưu thay đổi</Button>
        </div>
      </Modal>

      {/* Modal xem chi tiết PO */}
      {poDetail && (
        <Modal isOpen={!!poDetail} onClose={onPoDetailClose} title="Chi tiết đơn đặt hàng" size="lg">
          <div className={styles.poDetailSection}>
            <div className={styles.poDetailHeader}>
              <div>
                <div className={styles.poDetailCode}>{poDetail.code}</div>
                <div style={{ color: "var(--color-subtext)", fontSize: "var(--font-sm)", marginTop: 4 }}>{poDetail.supplierName}</div>
              </div>
              <span className={styles.poStatusBadge}>{ORDER_STATUS_LABEL[poDetail.status] || poDetail.status}</span>
            </div>
            <div className={styles.poDetailMeta}>
              <span><i className="fi fi-rr-calendar" /> Ngày đặt: {formatDateTime(poDetail.orderDate)}</span>
              {poDetail.receivedDate && <span><i className="fi fi-rr-box-check" /> Ngày nhận: {formatDateTime(poDetail.receivedDate)}</span>}
              <span><i className="fi fi-rr-user" /> Người tạo: {poDetail.createdByName}</span>
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
                          {[item.option1Value, item.option2Value, item.option3Value].filter(Boolean).join(" / ")
                            ? ` – ${[item.option1Value, item.option2Value, item.option3Value].filter(Boolean).join(" / ")}`
                            : ""}
                        </div>
                        <div style={{ color: "var(--color-subtext)", fontSize: "0.75rem", marginTop: 2 }}>{item.sku}</div>
                      </td>
                      <td style={{ textAlign: "center" }}>{item.quantity}</td>
                      <td style={{ textAlign: "right" }}>{formatCurrency(item.unitPrice)}</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: "var(--color-primary)" }}>{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "var(--space-3)", borderTop: "1px solid var(--color-border)" }}>
              <span style={{ fontWeight: 600 }}>Tổng tiền:</span>
              <span style={{ fontWeight: 700, fontSize: "var(--font-lg)", color: "var(--color-primary)" }}>{formatCurrency(poDetail.totalAmount)}</span>
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={onPoDetailClose}>Đóng</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
