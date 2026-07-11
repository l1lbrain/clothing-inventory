import { useState, useEffect, useMemo, useRef } from "react";
import type { Product } from "../../types/product.types";
import styles from "./SearchableProductDropdown.module.css";

interface Props {
  value: string;
  onChange: (val: string) => void;
  products: Product[];
  /** IDs đã được chọn ở các dòng khác (để disable) */
  selectedIds?: string[];
  placeholder?: string;
}

export function SearchableProductDropdown({
  value,
  onChange,
  products,
  selectedIds = [],
  placeholder = "-- Chọn sản phẩm --",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }, [products, search]);

  const selectedProduct = products.find((p) => p.id === value);

  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      <div
        className={styles.dropdownTrigger}
        onClick={() => setIsOpen(!isOpen)}
        role="combobox"
        aria-expanded={isOpen}
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setIsOpen(!isOpen)}
      >
        <span className={!selectedProduct ? styles.placeholder : ""}>
          {selectedProduct
            ? `${selectedProduct.sku} – ${selectedProduct.name}`
            : placeholder}
        </span>
        <i className={`fi fi-rr-angle-small-${isOpen ? "up" : "down"}`} />
      </div>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          <div className={styles.searchWrapper}>
            <i className="fi fi-rr-search" />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm theo SKU hoặc tên sản phẩm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className={styles.list}>
            {filtered.length === 0 ? (
              <div className={styles.noResults}>Không tìm thấy sản phẩm</div>
            ) : (
              filtered.slice(0, 30).map((p) => {
                const isAlreadySelected = selectedIds.includes(p.id);
                const isCurrentSelected = p.id === value;
                const isHighlighted = isAlreadySelected || isCurrentSelected;

                return (
                  <div
                    key={p.id}
                    className={[
                      styles.item,
                      isCurrentSelected ? styles.activeItem : "",
                    ].join(" ")}
                    style={{
                      opacity: isAlreadySelected ? 0.5 : 1,
                      cursor: isAlreadySelected ? "not-allowed" : "pointer",
                      paddingRight: isHighlighted ? "32px" : "12px",
                    }}
                    onClick={() => {
                      if (isAlreadySelected) return;
                      onChange(p.id);
                      setIsOpen(false);
                      setSearch("");
                    }}
                  >
                    <span className={styles.itemName}>{p.name}</span>
                    <span className={styles.itemSku}>{p.sku}</span>
                    {isHighlighted && (
                      <div className={styles.checkmark}>
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
