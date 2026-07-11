import React, { useState } from "react";
import styles from "./useTableSort.module.css";

interface UseSortReturn<T extends string> {
  sortBy: T;
  sortDir: "asc" | "desc";
  handleSort: (field: T) => void;
  buildSortHeader: (label: string, field: T) => React.ReactElement;
}

/**
 * Hook tái sử dụng logic sort cho các bảng dữ liệu.
 * Thay thế cho 4 bản duplicate handleSort + buildSortHeader ở các page.
 *
 * @param initialField Cột sort mặc định
 * @param onSortChange Callback khi sort thay đổi (thường dùng để reset page về 1)
 */
export function useTableSort<T extends string>(
  initialField: T,
  onSortChange?: () => void,
): UseSortReturn<T> {
  const [sortBy, setSortBy] = useState<T>(initialField);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (field: T) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    onSortChange?.();
  };

  const buildSortHeader = (label: string, field: T): React.ReactElement => {
    const isActive = sortBy === field;
    const isAsc = isActive && sortDir === "asc";
    const iconClass = isAsc ? "fi fi-rr-caret-up" : "fi fi-rr-caret-down";

    return (
      <span
        className={styles.sortableHeader}
        onClick={() => handleSort(field)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleSort(field)}
      >
        {label}
        <i className={`${iconClass} ${isActive ? styles.sortIconActive : styles.sortIcon}`} />
      </span>
    );
  };

  return { sortBy, sortDir, handleSort, buildSortHeader };
}
