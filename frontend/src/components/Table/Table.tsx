import type { ReactNode } from "react";
import type { TableColumn } from "../../types/common.types";
import styles from "./Table.module.css";

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: keyof T;
  emptyText?: string;
  loading?: boolean;
}

export function Table<T>({
  columns,
  data,
  rowKey,
  emptyText = "Không có dữ liệu",
  loading = false,
}: TableProps<T>) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={styles.th}
                style={col.width ? { width: col.width } : undefined}
                data-align={col.align ?? "left"}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyCell}>
                <div className={styles.loadingRow}>
                  <i className="fi fi-rr-spinner" aria-hidden />
                  <span>Đang tải...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyCell}>
                <div className={styles.empty}>
                  <i className="fi fi-rr-inbox" aria-hidden />
                  <span>{emptyText}</span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={String(row[rowKey])} className={styles.tr}>
                {columns.map((col) => {
                  const cellValue = row[col.key as keyof T] ?? "—";
                  return (
                    <td
                      key={String(col.key)}
                      className={[
                        styles.td,
                        !col.render ? styles.ellipsisCell : "",
                      ].join(" ")}
                      data-align={col.align ?? "left"}
                      title={
                        !col.render && cellValue !== "—"
                          ? String(cellValue)
                          : undefined
                      }
                    >
                      {col.render
                        ? (col.render(
                            row[col.key as keyof T] as unknown,
                            row,
                          ) as ReactNode)
                        : String(cellValue)}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
