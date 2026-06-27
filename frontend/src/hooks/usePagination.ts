import { useState, useMemo } from "react";
import type { PaginationState } from "../types/common.types";

interface UsePaginationReturn<T> {
  currentItems: T[];
  pagination: PaginationState;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

export function usePagination<T>(
  items: T[],
  initialPageSize: number = 10,
): UsePaginationReturn<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalPages = Math.ceil(items.length / pageSize);

  const currentItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  return {
    currentItems,
    pagination: { page, pageSize, total: items.length },
    goToPage,
    setPageSize,
  };
}
