import { Select } from "../../../components/Select/Select";
import {
  SupplierSearchDropdown,
  type SupplierOption,
} from "../../../components/SupplierSearchDropdown/SupplierSearchDropdown";
import { DATE_PRESET_OPTIONS, type DatePreset, getDateRangeForPreset, toIsoLocal } from "../../../utils/datePreset";
import styles from "./PurchaseOrderFilters.module.css";

interface Props {
  statusFilter: string;
  onStatusChange: (v: string) => void;
  supplierFilter: SupplierOption | null;
  onSupplierChange: (s: SupplierOption | null) => void;
  datePreset: DatePreset | "";
  customFrom: string;
  customTo: string;
  onDatePresetChange: (val: DatePreset | "", from: string, to: string) => void;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  onApplyCustomDate: () => void;
}

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "DRAFT", label: "Nháp" },
  { value: "PENDING", label: "Chờ nhập hàng" },
  { value: "RECEIVED", label: "Đã nhận hàng" },
];

export function PurchaseOrderFilters({
  statusFilter, onStatusChange,
  supplierFilter, onSupplierChange,
  datePreset, customFrom, customTo,
  onDatePresetChange, onCustomFromChange, onCustomToChange, onApplyCustomDate,
}: Props) {
  return (
    <div className={styles.filterBar}>

      <div className={styles.filterGroup}>
        <Select
          id="statusFilter"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        />
      </div>

      <div className={styles.filterGroup}>
        <SupplierSearchDropdown
          value={supplierFilter}
          onSelect={onSupplierChange}
          placeholder="Tất cả nhà cung cấp"
        />
      </div>

      <div className={styles.dateFilterGroup}>
        <Select
          id="datePresetFilter"
          options={DATE_PRESET_OPTIONS}
          value={datePreset}
          onChange={(e) => {
            const val = e.target.value as DatePreset | "";
            if (val === "" ) {
              onDatePresetChange("", "", "");
            } else if (val !== "custom") {
              const { from, to } = getDateRangeForPreset(val as DatePreset);
              onDatePresetChange(val as DatePreset, toIsoLocal(from, false), toIsoLocal(to, true));
            } else {
              onDatePresetChange("custom", "", "");
            }
          }}
        />
        {datePreset === "custom" && (
          <div className={styles.customDateRow}>
            <input
              type="date"
              className={styles.dateInput}
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
              aria-label="Từ ngày"
            />
            <span className={styles.dateSeparator}>→</span>
            <input
              type="date"
              className={styles.dateInput}
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
              aria-label="Đến ngày"
            />
            <button className={styles.applyDateBtn} onClick={onApplyCustomDate}>
              <i className="fi fi-rr-check" /> Áp dụng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
