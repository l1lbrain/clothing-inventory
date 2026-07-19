import { useState, useEffect, useRef } from "react";
import { getSuppliersPage } from "../../services/supplier";
import styles from "./SupplierSearchDropdown.module.css";

export interface SupplierOption {
  id: string;
  code: string;
  name: string;
}

export interface SupplierSearchDropdownProps {
  value: SupplierOption | null;
  onSelect: (supplier: SupplierOption | null) => void;
  placeholder?: string;
}

export function SupplierSearchDropdown({
  value,
  onSelect,
  placeholder = "Tìm theo tên hoặc mã NCC...",
}: SupplierSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch suppliers từ API với debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await getSuppliersPage(1, search || undefined, "active");
        setResults(
          res.items.map((s) => ({ id: s.id, code: s.code, name: s.companyName }))
        );
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Đóng khi click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (supplier: SupplierOption) => {
    onSelect(supplier);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    setSearch("");
  };

  const triggerLabel = value ? `${value.name}` : null;

  return (
    <div className={styles.supplierDropdownWrap} ref={dropdownRef}>
      <div
        className={[
          styles.supplierDropdownTrigger,
          value ? styles.hasValue : "",
        ].join(" ")}
        onClick={() => setIsOpen((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setIsOpen((prev) => !prev)}
      >
        {triggerLabel ? (
          <span className={styles.supplierTriggerText}>{triggerLabel}</span>
        ) : (
          <span className={styles.supplierTriggerPlaceholder}>{placeholder}</span>
        )}
        {value ? (
          <button
            className={styles.supplierDropdownClear}
            onClick={handleClear}
            title="Xóa bộ lọc NCC"
            type="button"
          >
            <i className="fi fi-rr-cross-small" />
          </button>
        ) : (
          <i className={`fi fi-rr-angle-small-${isOpen ? "up" : "down"}`} />
        )}
      </div>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          <div className={styles.dropdownSearchWrapper}>
            {loading ? (
              <div className={styles.supplierSpinner} />
            ) : (
              <i className="fi fi-rr-search" />
            )}
            <input
              type="text"
              className={styles.dropdownSearchInput}
              placeholder="Tìm theo tên hoặc mã NCC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className={styles.dropdownList}>
            {loading && results.length === 0 ? (
              <div className={styles.supplierLoadingRow}>
                <div className={styles.supplierSpinner} />
                Đang tải...
              </div>
            ) : results.length === 0 ? (
              <div className={styles.noResults}>Không tìm thấy nhà cung cấp</div>
            ) : (
              results.map((s) => (
                <div
                  key={s.id}
                  className={[
                    styles.supplierDropdownItem,
                    value?.id === s.id ? styles.activeItem : "",
                  ].join(" ")}
                  onClick={() => handleSelect(s)}
                >
                  <span className={styles.supplierItemName}>{s.name}</span>
                  <span className={styles.supplierCodeBadge}>{s.code}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
