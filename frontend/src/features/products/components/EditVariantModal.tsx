import type { Variant } from "../../../types/product.types";
import { Modal } from "../../../components/Modal/Modal";
import { Button } from "../../../components/Button/Button";
import { Input } from "../../../components/Input/Input";
import { Select } from "../../../components/Select/Select";
import { formatInputNumber } from "../../../utils/variantHelpers";
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
  onClose: () => void;
  onFormChange: (field: keyof VariantForm, value: string) => void;
  onSave: () => void;
}

export function EditVariantModal({
  isEditOpen,
  variant,
  product,
  form,
  errors,
  onClose,
  onFormChange,
  onSave,
}: Props) {
  const optionSlots = [
    { key: "option1Value" as const, name: product?.option1Name },
    { key: "option2Value" as const, name: product?.option2Name },
    { key: "option3Value" as const, name: product?.option3Name },
  ].filter((slot) => !!slot.name);

  const stockChanged = variant !== null && Number(form.stock) !== variant?.stock;

  return (
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
  );
}
