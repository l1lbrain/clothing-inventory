import { Modal } from "../../../components/Modal/Modal";
import { Button } from "../../../components/Button/Button";
import { Input } from "../../../components/Input/Input";
import { Select } from "../../../components/Select/Select";
import { formatInputNumber } from "../../../utils/variantHelpers";
import styles from "./BulkEditVariantModal.module.css";

interface BulkForm {
  importPrice: string;
  salePrice: string;
  status: string;
}

interface Props {
  isOpen: boolean;
  checkedCount: number;
  form: BulkForm;
  errors: Record<string, string>;
  onClose: () => void;
  onFormChange: (field: keyof BulkForm, value: string) => void;
  onSave: () => void;
}

export function BulkEditVariantModal({ isOpen, checkedCount, form, errors, onClose, onFormChange, onSave }: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chỉnh sửa hàng loạt (${checkedCount} phiên bản)`}
      size="md"
    >
      <div className={styles.form}>
        <p className={styles.hint}>
          Chỉ điền trường bạn muốn thay đổi. Trường để trống sẽ giữ nguyên giá trị cũ.
        </p>
        <div className={styles.formGrid}>
          <Input
            id="bulk-importPrice"
            label="Giá nhập"
            type="text"
            suffix="VND"
            value={formatInputNumber(form.importPrice)}
            onChange={(e) => {
              const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
              onFormChange("importPrice", raw);
            }}
            error={errors.importPrice}
            placeholder="0"
          />
          <Input
            id="bulk-salePrice"
            label="Giá bán"
            type="text"
            suffix="VND"
            value={formatInputNumber(form.salePrice)}
            onChange={(e) => {
              const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
              onFormChange("salePrice", raw);
            }}
            error={errors.salePrice}
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
            value={form.status}
            onChange={(e) => onFormChange("status", e.target.value)}
          />
        </div>
      </div>
      <div className={styles.modalActions}>
        <Button variant="secondary" onClick={onClose}>Hủy</Button>
        <Button icon="fi fi-rr-check" onClick={onSave}>Áp dụng</Button>
      </div>
    </Modal>
  );
}
