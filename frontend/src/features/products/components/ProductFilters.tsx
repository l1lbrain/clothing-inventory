import { useMemo } from "react";
import type { CategoryResponseDto } from "../../../services/product";
import { Select } from "../../../components/Select/Select";
import { PRODUCT_STATUS_OPTIONS } from "../../../constants/statusMaps";
import styles from "./ProductFilters.module.css";

interface Props {
  categoryFilter: string;
  onCategoryChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  categories: CategoryResponseDto[];
}

export function ProductFilters({
  categoryFilter,
  onCategoryChange,
  statusFilter,
  onStatusChange,
  categories,
}: Props) {
  const categoryOptions = useMemo(
    () => [
      { value: "", label: "Tất cả danh mục" },
      ...categories.map((cat) => ({ value: cat.name, label: cat.name })),
    ],
    [categories],
  );

  return (
    <div className={styles.filtersRow}>
      <div className={styles.dropdowns}>
        <Select
          id="categoryFilter"
          options={categoryOptions}
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
        />
        <Select
          id="statusFilter"
          options={PRODUCT_STATUS_OPTIONS as unknown as { value: string; label: string }[]}
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        />
      </div>
    </div>
  );
}
