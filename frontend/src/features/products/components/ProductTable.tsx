import { useMemo } from "react";
import type { Product } from "../../../types/product.types";
import type { TableColumn } from "../../../types/common.types";
import { Table } from "../../../components/Table/Table";
import { Button } from "../../../components/Button/Button";
import { formatDateTime } from "../../../utils/formatters";
import { useTableSort } from "../../../hooks/useTableSort";
import styles from "./ProductTable.module.css";

type SortField = "name" | "brand" | "createdAt" | "updatedAt";

interface Props {
  products: Product[];
  loading: boolean;
  onView: (product: Product) => void;
  onDelete: (productId: string) => void;
  onSortChange?: (sortBy: SortField, sortDir: "asc" | "desc") => void;
  sortBy?: SortField;
  sortDir?: "asc" | "desc";
}

export function ProductTable({ products, loading, onView, onDelete, sortBy: externalSortBy, onSortChange }: Props) {
  const { buildSortHeader, sortBy, sortDir } = useTableSort<SortField>(
    externalSortBy ?? "createdAt",
    () => onSortChange?.(sortBy, sortDir),
  );

  const columns: TableColumn<Product>[] = useMemo(() => [
    {
      key: "code",
      label: "Mã sản phẩm",
      width: "140px",
    },
    { key: "name", label: buildSortHeader("Tên sản phẩm", "name") },
    { key: "categoryLabel", label: "Danh mục", width: "140px" },
    {
      key: "brand",
      label: buildSortHeader("Thương hiệu", "brand"),
      width: "140px",
      render: (val) => (val as string) || "—",
    },
    {
      key: "stock",
      label: "Tồn kho",
      align: "center",
      width: "120px",
      render: (val) => (
        <span className={[(val as number) < 20 ? styles.lowStock : styles.stockBadge].join(" ")}>
          {val as number}
        </span>
      ),
    },
    {
      key: "status",
      label: "Trạng thái",
      width: "120px",
      align: "center",
      render: (val) => {
        const isActive = String(val).toUpperCase() === "ACTIVE";
        return (
          <span className={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive].join(" ")}>
            {isActive ? "Đang bán" : "Ngừng bán"}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      label: buildSortHeader("Ngày tạo", "createdAt"),
      width: "130px",
      render: (val) => <span className={styles.dateCell}>{formatDateTime(val as string)}</span>,
    },
    {
      key: "id",
      label: "Hành động",
      width: "180px",
      align: "center",
      render: (_, row) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          <Button variant="ghost" size="sm" icon="fi fi-rr-eye" onClick={() => onView(row)}>
            Xem
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon="fi fi-rr-trash"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row.id);
            }}
          >
            Xóa
          </Button>
        </div>
      ),
    },
  ], [buildSortHeader, onView, onDelete]);

  return (
    <Table
      columns={columns}
      data={products}
      rowKey="id"
      loading={loading}
      emptyText="Không tìm thấy sản phẩm"
    />
  );
}
