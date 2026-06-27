import type { PaginationState } from "../../types/common.types";
import styles from "./Pagination.module.css";

interface PaginationProps {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
}

export function Pagination({ pagination, onPageChange }: PaginationProps) {
  const { page, pageSize, total } = pagination;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Tính danh sách trang
  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages: (number | "...")[] = [1];
    if (page > 3) pages.push("...");

    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      pages.push(i);
    }

    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className={styles.pagination}>
      <span className={styles.info}>
        {start}–{end} / {total} kết quả
      </span>
      <div className={styles.controls}>
        <button
          className={styles.pageBtn}
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Trang trước"
        >
          <i className="fi fi-rr-angle-small-left" aria-hidden />
        </button>

        {getPageNumbers().map((p, idx) =>
          p === "..." ? (
            <span key={`dots-${idx}`} className={styles.dots}>
              …
            </span>
          ) : (
            <button
              key={p}
              className={[styles.pageBtn, page === p ? styles.active : ""].join(
                " ",
              )}
              onClick={() => onPageChange(p as number)}
              aria-current={page === p ? "page" : undefined}
            >
              {p}
            </button>
          ),
        )}

        <button
          className={styles.pageBtn}
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Trang sau"
        >
          <i className="fi fi-rr-angle-small-right" aria-hidden />
        </button>
      </div>
    </div>
  );
}
