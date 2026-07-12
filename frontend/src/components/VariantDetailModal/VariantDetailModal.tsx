import { useEffect, useState } from "react";
import { Modal } from "../Modal/Modal";
import { Button } from "../Button/Button";
import { getVariantById, type ProductVariantDetailResponseDto } from "../../services/product";
import { getTransactionsByVariantId, type InventoryTransactionDto } from "../../services/inventoryTransaction";
import { Pagination } from "../Pagination/Pagination";
import styles from "./VariantDetailModal.module.css";

interface VariantDetailModalProps {
  variantId: string | null;
  onClose: () => void;
  onEdit?: () => void;
}

// Định dạng tiền tệ
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " VND";
}

// Định dạng ngày giờ
function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// Thành phần hiển thị chi tiết biến thể
export function VariantDetailModal({ variantId, onClose, onEdit }: VariantDetailModalProps) {
  const [prevVariantId, setPrevVariantId] = useState<string | null>(null);
  const [variant, setVariant] = useState<ProductVariantDetailResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Các trạng thái lịch sử giao dịch
  const [activeTab, setActiveTab] = useState<"info" | "history">("info");
  const [txHistory, setTxHistory] = useState<InventoryTransactionDto[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txTotalElements, setTxTotalElements] = useState(0);
  const [txPageSize, setTxPageSize] = useState(10);

  if (variantId !== prevVariantId) {
    setPrevVariantId(variantId);
    setVariant(null);
    setError(null);
    setLoading(!!variantId);

    // Đặt lại các trạng thái giao dịch
    setActiveTab("info");
    setTxHistory([]);
    setTxPage(1);
    setTxTotalElements(0);
  }

  useEffect(() => {
    if (!variantId) {
      return;
    }

    let cancelled = false;

    getVariantById(variantId)
      .then((data) => {
        if (!cancelled) setVariant(data);
      })
      .catch(() => {
        if (!cancelled) setError("Không thể tải thông tin phiên bản sản phẩm.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [variantId]);

  // Hàm fetchTxHistory
  const fetchTxHistory = async (targetPage: number) => {
    if (!variantId) return;
    try {
      setTxLoading(true);
      const result = await getTransactionsByVariantId(variantId, targetPage);
      setTxHistory(result.items);
      setTxTotalElements(result.totalElements);
      setTxPageSize(result.pageSize);
    } catch (err) {
      console.error("Failed to fetch transaction history:", err);
    } finally {
      setTxLoading(false);
    }
  };

  // Xử lý tab change
  const handleTabChange = (tab: "info" | "history") => {
    setActiveTab(tab);
    if (tab === "history" && txHistory.length === 0) {
      fetchTxHistory(1);
    }
  };

  // Xử lý page change
  const handlePageChange = (p: number) => {
    setTxPage(p);
    fetchTxHistory(p);
  };

  const isActive = variant?.status?.toUpperCase() === "ACTIVE";

  return (
    <Modal isOpen={!!variantId} onClose={onClose} title="Chi tiết phiên bản sản phẩm" size="xl">
      {loading && (
        <div style={{ padding: "32px", textAlign: "center", color: "var(--color-subtext)" }}>
          <i className="fi fi-rr-spinner" style={{ marginRight: 8 }} />
          Đang tải thông tin phiên bản...
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: "32px", textAlign: "center", color: "var(--color-danger)" }}>
          <i className="fi fi-rr-exclamation" style={{ marginRight: 8 }} />
          {error}
        </div>
      )}

      {variant && !loading && (
        <>
          
          <div className={styles.tabNav}>
            <button
              className={[styles.tabBtn, activeTab === "info" ? styles.tabBtnActive : ""].join(" ")}
              onClick={() => handleTabChange("info")}
              type="button"
            >
              <i className="fi fi-rr-info" />
              Thông tin
            </button>
            <button
              className={[styles.tabBtn, activeTab === "history" ? styles.tabBtnActive : ""].join(" ")}
              onClick={() => handleTabChange("history")}
              type="button"
            >
              <i className="fi fi-rr-time-past" />
              Lịch sử giao dịch
            </button>
          </div>

          
          {activeTab === "info" && (
            <div className={styles.detail}>
              {(() => {
                const rowsList: { key: string; value: React.ReactNode; isFullWidth: boolean }[] = [
                  { key: "Tên sản phẩm", value: variant.productName, isFullWidth: true },
                  { key: "Mã SKU", value: <code style={{ fontFamily: "monospace", fontSize: "var(--font-sm)" }}>{variant.sku}</code>, isFullWidth: false },
                  { key: "Mã sản phẩm", value: variant.productCode, isFullWidth: false },
                  { key: "Danh mục", value: variant.categoryName || "—", isFullWidth: false },
                ];

                if (variant.brand) {
                  rowsList.push({ key: "Thương hiệu", value: variant.brand, isFullWidth: false });
                }

                if (variant.attributes && Object.keys(variant.attributes).length > 0) {
                  Object.entries(variant.attributes).forEach(([attrName, attrValue]) => {
                    rowsList.push({
                      key: attrName,
                      value: attrValue || "—",
                      isFullWidth: false,
                    });
                  });
                }

                rowsList.push(
                  { key: "Giá nhập", value: formatCurrency(variant.purchasePrice), isFullWidth: false },
                  { key: "Giá bán", value: formatCurrency(variant.salePrice), isFullWidth: false },
                  {
                    key: "Tồn kho",
                    value: (
                      <span style={{ color: variant.quantityOnHand < 20 ? "var(--color-warning)" : "var(--color-text)", fontWeight: 600 }}>
                        {variant.quantityOnHand} sản phẩm
                      </span>
                    ),
                    isFullWidth: false,
                  },
                  {
                    key: "Trạng thái",
                    value: (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: "var(--radius-full)",
                          fontSize: "var(--font-xs)",
                          fontWeight: 600,
                          backgroundColor: isActive ? "var(--color-success-light)" : "var(--color-hover)",
                          color: isActive ? "var(--color-success)" : "var(--color-subtext)",
                        }}
                      >
                        {isActive ? "Đang bán" : "Ngừng bán"}
                      </span>
                    ),
                    isFullWidth: false,
                  },
                  { key: "Ngày tạo", value: formatDateTime(variant.createdAt), isFullWidth: false },
                  { key: "Ngày cập nhật", value: formatDateTime(variant.updatedAt), isFullWidth: false }
                );

                if (variant.description) {
                  rowsList.push({ key: "Mô tả", value: variant.description, isFullWidth: true });
                }

                return rowsList.map(({ key, value, isFullWidth }) => (
                  <div
                    key={key}
                    className={[
                      styles.detailRow,
                      isFullWidth ? styles.detailRowFullWidth : "",
                    ].join(" ")}
                  >
                    <span className={styles.detailKey}>{key}</span>
                    <span className={styles.detailVal}>{value}</span>
                  </div>
                ));
              })()}
            </div>
          )}

          
          {activeTab === "history" && (
            <div>
              {txLoading ? (
                <div className={styles.txLoading}>
                  <i className="fi fi-rr-spinner" style={{ marginRight: 8 }} />
                  Đang tải lịch sử giao dịch...
                </div>
              ) : txHistory.length === 0 ? (
                <div className={styles.txEmpty}>
                  <i className="fi fi-rr-time-past" style={{ fontSize: 24, display: "block", marginBottom: 8, opacity: 0.4 }} />
                  Chưa có giao dịch kho nào
                </div>
              ) : (
                <div className={styles.txTableWrapper}>
                  <table className={styles.txTable}>
                    <thead>
                      <tr>
                        <th style={{ width: "100px", textAlign: "center" }}>Loại thay đổi</th>
                        <th style={{ width: "70px", textAlign: "center" }}>SL</th>
                        <th style={{ width: "80px", textAlign: "center" }}>Trước</th>
                        <th style={{ width: "80px", textAlign: "center" }}>Sau</th>
                        <th>Ghi chú</th>
                        <th style={{ width: "140px" }}>Người tạo</th>
                        <th style={{ width: "140px" }}>Thời gian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txHistory.map((tx) => {
                        const isIN = tx.transactionType === "IN";
                        const isOUT = tx.transactionType === "OUT";
                        const badgeClass = isIN
                          ? styles.txBadgeIn
                          : isOUT
                            ? styles.txBadgeOut
                            : tx.transactionType === "ADJUSTMENT"
                              ? styles.txBadgeAdj
                              : styles.txBadgeDefault;

                        const txTypeLabel = isIN ? "Nhập kho" : isOUT ? "Xuất kho" : tx.transactionType === "ADJUSTMENT" ? "Điều chỉnh" : tx.transactionType;

                        return (
                          <tr key={tx.id}>
                            <td>
                              <span className={[styles.txBadge, badgeClass].join(" ")}>
                                {txTypeLabel}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span className={isIN ? styles.txQtyIn : isOUT ? styles.txQtyOut : styles.txQtyAdj}>
                                {isIN || tx.quantity > 0 ? "+" : ""}{tx.quantity}
                              </span>
                            </td>
                            <td style={{ textAlign: "center", color: "var(--color-subtext)" }}>
                              {tx.quantityBefore}
                            </td>
                            <td style={{ textAlign: "center", fontWeight: 600 }}>
                              {tx.quantityAfter}
                            </td>
                            <td>
                              {isIN && tx.purchaseOrderCode ? (
                                <span>
                                  {tx.note?.replace(tx.purchaseOrderCode, "").trim().replace(/\s*$/, " ") || "Nhập theo đơn "}
                                  <span style={{ color: "var(--color-primary)", fontWeight: 600, fontFamily: "monospace" }}>
                                    {tx.purchaseOrderCode}
                                  </span>
                                </span>
                              ) : (
                                <span style={{ color: "var(--color-subtext)" }}>
                                  {tx.note || "—"}
                                </span>
                              )}
                            </td>
                            <td style={{ color: "var(--color-subtext)" }}>
                              {tx.createdByName || String(tx.createdBy)}
                            </td>
                            <td style={{ color: "var(--color-subtext)", whiteSpace: "nowrap" }}>
                              {formatDateTime(tx.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              
              {txTotalElements > txPageSize && (
                <div className={styles.txPaginationWrap}>
                  <Pagination
                    pagination={{ page: txPage, pageSize: txPageSize, total: txTotalElements }}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </div>
          )}

          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
            {onEdit && (
              <Button variant="secondary" icon="fi fi-rr-edit" onClick={onEdit}>
                Chỉnh sửa
              </Button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
