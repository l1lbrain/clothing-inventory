import { useState, useMemo, useEffect, useRef } from "react";
import type {
  ReceiptItem,
  WarehouseReceipt,
} from "../../../types/payment.types";
import type { Supplier } from "../../../types/supplier.types";
import { getSuppliersPage } from "../../../services/supplier";
import type { Product } from "../../../types/product.types";
import { getProductsPage } from "../../../services/product";
import { Select } from "../../../components/Select/Select";
import { Input } from "../../../components/Input/Input";
import { Button } from "../../../components/Button/Button";
import { Card, CardHeader, CardBody } from "../../../components/Card/Card";
import { formatCurrency } from "../../../utils/formatters";
import { useToast } from "../../../components/Toast/ToastContext";
import styles from "./WarehouseReceipt.module.css";

interface LineItem extends ReceiptItem {
  productId: string;
}

const EMPTY_LINE: LineItem = {
  id: "",
  productId: "",
  sku: "",
  productName: "",
  quantity: 1,
  unitPrice: 0,
  totalPrice: 0,
};

interface SearchableProductDropdownProps {
  value: string;
  onChange: (val: string) => void;
  products: Product[];
  selectedIds: string[];
}

export function SearchableProductDropdown({
  value,
  onChange,
  products,
  selectedIds,
}: SearchableProductDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);
  const [direction, setDirection] = useState<"down" | "up">("down");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Tính toán hướng mở dropdown
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;

      // Chiều cao tối thiểu cần thiết = ~220px
      if (spaceBelow < 220) {
        setDirection("up");
      } else {
        setDirection("down");
      }
    } else {
      setDirection("down");
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }, [products, search]);

  const displayed = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  const selectedProduct = products.find((p) => p.id === value);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 10) {
      setVisibleCount((prev) => Math.min(prev + 20, filtered.length));
    }
  };

  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      <div
        className={styles.dropdownTrigger}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>
          {selectedProduct
            ? `${selectedProduct.sku} - ${selectedProduct.name}`
            : "-- Chọn sản phẩm --"}
        </span>
        <i
          className={`fi fi-rr-angle-small-${direction === "up" ? (isOpen ? "down" : "up") : isOpen ? "up" : "down"}`}
        />
      </div>

      {isOpen && (
        <div
          className={[
            styles.dropdownMenu,
            direction === "up" ? styles.menuUp : "",
          ].join(" ")}
        >
          <div className={styles.dropdownSearchWrapper}>
            <i className="fi fi-rr-search" />
            <input
              type="text"
              className={styles.dropdownSearchInput}
              placeholder="Tìm sản phẩm (SKU, tên...)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(20);
              }}
              autoFocus
            />
          </div>
          <div className={styles.dropdownList} onScroll={handleScroll}>
            {displayed.length === 0 ? (
              <div className={styles.noResults}>Không tìm thấy sản phẩm</div>
            ) : (
              displayed.map((p) => {
                const isAlreadySelected = selectedIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className={[
                      styles.dropdownItem,
                      p.id === value ? styles.activeItem : "",
                    ].join(" ")}
                    onClick={() => {
                      onChange(p.id);
                      setIsOpen(false);
                      setSearch("");
                    }}
                  >
                    <div className={styles.itemHeader}>
                      <span className={styles.itemName}>{p.name}</span>
                      <span className={styles.itemSku}>{p.sku}</span>
                    </div>
                    <div className={styles.itemStock}>
                      Tồn: {p.stock}
                      {p.size && ` | Size: ${p.size}`}
                      {p.color && ` | Màu: ${p.color}`}
                      {p.material && ` | Chất liệu: ${p.material}`}
                      {` | Giá nhập: ${new Intl.NumberFormat("vi-VN").format(p.importPrice)}đ`}
                    </div>
                    {isAlreadySelected && (
                      <div className={styles.checkmarkWrapper}>
                        <i className="fi fi-rr-check-circle" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function WarehouseReceiptPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ ...EMPTY_LINE, id: "1" }]);
  const [saved, setSaved] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // Lấy tất cả NCC
    getSuppliersPage(1)
      .then(async (firstPage) => {
        let allSuppliers = [...firstPage.items];
        const totalPages = firstPage.totalPages;

        if (totalPages > 1) {
          const promises = [];
          for (let p = 2; p <= totalPages; p++) {
            promises.push(getSuppliersPage(p));
          }
          const results = await Promise.all(promises);
          results.forEach((res) => {
            allSuppliers = allSuppliers.concat(res.items);
          });
        }
        setSuppliers(allSuppliers);
      })
      .catch((err) => {
        console.error("Lỗi tải danh sách nhà cung cấp:", err);
      });

    // Lấy tất cả sản phẩm
    getProductsPage(1)
      .then(async (firstPage) => {
        let allProducts = [...firstPage.items];
        const totalPages = firstPage.totalPages;

        if (totalPages > 1) {
          const promises = [];
          for (let p = 2; p <= totalPages; p++) {
            promises.push(getProductsPage(p));
          }
          const results = await Promise.all(promises);
          results.forEach((res) => {
            allProducts = allProducts.concat(res.items);
          });
        }

        // Chuyển SP cha thành danh sách biến thể
        const flattenedVariants: Product[] = allProducts.flatMap((p) => {
          if (!p.variants || p.variants.length === 0) return [];
          return p.variants.map((v) => ({
            id: String(v.id),
            code: p.code,
            sku: v.sku,
            name: p.name,
            category: p.category,
            categoryLabel: p.categoryLabel,
            importPrice: v.importPrice,
            salePrice: v.salePrice,
            unit: p.unit || "Cái",
            stock: v.stock,
            description: p.description,
            image: p.image,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            size: v.size,
            color: v.color,
            material: v.material,
            variants: [],
          }));
        });

        setProducts(flattenedVariants);
      })
      .catch((err) => {
        console.error("Lỗi tải danh sách sản phẩm:", err);
      });
  }, []);

  const supplierOptions = useMemo(() => {
    return suppliers.map((s) => ({
      value: s.id && s.id !== "undefined" ? s.id : s.code,
      label: s.companyName,
    }));
  }, [suppliers]);

  const totalQty = useMemo(
    () => lines.reduce((s, l) => s + (l.quantity || 0), 0),
    [lines],
  );
  const totalAmount = useMemo(
    () => lines.reduce((s, l) => s + (l.totalPrice || 0), 0),
    [lines],
  );

  const updateLine = (
    idx: number,
    field: keyof LineItem,
    value: string | number,
  ) => {
    if (field === "productId" && value) {
      const isDuplicate = lines.some(
        (line, i) => i !== idx && line.productId === String(value),
      );
      if (isDuplicate) {
        showToast("Sản phẩm này đã có trong danh sách nhập hàng", "warning");
        return;
      }
    }

    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== idx) return line;

        if (field === "productId") {
          const product = products.find((p) => p.id === String(value));
          if (!product) return { ...line, productId: String(value) };
          return {
            ...line,
            productId: product.id,
            sku: product.sku,
            productName: product.name,
            unitPrice: product.importPrice,
            totalPrice: product.importPrice * line.quantity,
          };
        }

        const updated = { ...line, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          updated.totalPrice =
            (updated.quantity || 0) * (updated.unitPrice || 0);
        }
        return updated;
      }),
    );
  };

  const addLine = () => {
    setLines((prev) => [...prev, { ...EMPTY_LINE, id: String(Date.now()) }]);
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = (isDraft: boolean) => {
    const receipt: Partial<WarehouseReceipt> = {
      code: `PNK-2026-${String(Date.now()).slice(-4)}`,
      supplierId,
      supplierName:
        suppliers.find((s) => s.id === supplierId)?.companyName ?? "",
      items: lines,
      totalQuantity: totalQty,
      totalAmount,
      isDraft,
      createdAt: new Date().toISOString().split("T")[0],
    };

    console.log("Phiếu nhập kho:", receipt);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <section>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Lập phiếu nhập kho</h2>
            <p className={styles.subtitle}>
              Tạo phiếu nhập mới từ nhà cung cấp
            </p>
          </div>
          {saved && (
            <div className={styles.savedAlert}>
              <i className="fi fi-rr-check-circle" aria-hidden />
              <span>Đã lưu thành công</span>
            </div>
          )}
        </div>

        <div className={styles.content}>
          <Card>
            <CardHeader title="Thông tin nhà cung cấp" />
            <CardBody>
              <div className={styles.formRow}>
                <Select
                  id="supplier"
                  label="Nhà cung cấp"
                  required
                  options={supplierOptions}
                  placeholder="Chọn nhà cung cấp"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                />
                <Input
                  id="receiptNote"
                  label="Ghi chú"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú thêm..."
                />
              </div>
            </CardBody>
          </Card>

          <Card className={styles.tableCard}>
            <CardHeader
              title="Danh sách hàng nhập"
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  icon="fi fi-rr-add"
                  onClick={addLine}
                >
                  Thêm dòng
                </Button>
              }
            />
            <CardBody className={styles.tableCardBody}>
              <div className={styles.tableWrapper}>
                <table className={styles.lineTable}>
                  <thead>
                    <tr>
                      <th style={{ width: "60px", textAlign: "center" }}>
                        STT
                      </th>
                      <th style={{ width: "350px" }}>Sản phẩm</th>
                      <th style={{ width: "150px" }}>SKU</th>
                      <th style={{ width: "100px" }}>Số lượng</th>
                      <th style={{ width: "150px" }}>Đơn giá</th>
                      <th style={{ width: "150px" }}>Thành tiền</th>
                      <th style={{ width: "50px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={line.id}>
                        <td className={styles.indexCell}>{idx + 1}</td>
                        <td className={styles.productCell}>
                          <SearchableProductDropdown
                            value={line.productId}
                            onChange={(val) =>
                              updateLine(idx, "productId", val)
                            }
                            products={products}
                            selectedIds={lines
                              .map((l) => l.productId)
                              .filter(Boolean)}
                          />
                          {line.productId &&
                            (() => {
                              const selected = products.find(
                                (p) => p.id === line.productId,
                              );
                              if (!selected) return null;
                              const details = [
                                selected.size ? `Size: ${selected.size}` : "",
                                selected.color ? `Màu: ${selected.color}` : "",
                                selected.material
                                  ? `Chất liệu: ${selected.material}`
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" | ");
                              if (!details) return null;
                              return (
                                <div className={styles.lineDetails}>
                                  {details}
                                </div>
                              );
                            })()}
                        </td>
                        <td className={styles.skuCell}>{line.sku || "—"}</td>
                        <td className={styles.qtyCell}>
                          <input
                            className={styles.lineInput}
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(
                                idx,
                                "quantity",
                                Number(e.target.value),
                              )
                            }
                          />
                        </td>
                        <td className={styles.priceCell}>
                          <input
                            className={styles.lineInput}
                            type="text"
                            value={
                              line.unitPrice
                                ? new Intl.NumberFormat("vi-VN").format(
                                    line.unitPrice,
                                  )
                                : ""
                            }
                            readOnly
                            disabled
                            style={{
                              backgroundColor: "var(--color-bg)",
                              cursor: "not-allowed",
                              color: "var(--color-subtext)",
                            }}
                          />
                        </td>
                        <td className={styles.totalCell}>
                          {formatCurrency(line.totalPrice)}
                        </td>
                        <td className={styles.actionCell}>
                          <button
                            className={styles.removeBtn}
                            onClick={() => removeLine(idx)}
                            aria-label="Xóa dòng"
                          >
                            <i className="fi fi-rr-trash" aria-hidden />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className={styles.summaryCardBody}>
              <div className={styles.summaryList}>
                <div className={styles.summaryRow}>
                  <span>Tổng số lượng:</span>
                  <strong>{totalQty}</strong>
                </div>
                <div className={styles.summaryRow}>
                  <span>Tổng số dòng:</span>
                  <strong>{lines.length}</strong>
                </div>
                <div className={[styles.summaryRow, styles.totalRow].join(" ")}>
                  <span>Tổng tiền:</span>
                  <strong className={styles.totalAmount}>
                    {formatCurrency(totalAmount)}
                  </strong>
                </div>
              </div>

              <div className={styles.sideActions}>
                <Button
                  variant="secondary"
                  onClick={() => handleSave(true)}
                  icon="fi fi-rr-disk"
                >
                  Lưu nháp
                </Button>
                <Button onClick={() => handleSave(false)} icon="fi fi-rr-check">
                  Xác nhận nhập kho
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </section>
  );
}
