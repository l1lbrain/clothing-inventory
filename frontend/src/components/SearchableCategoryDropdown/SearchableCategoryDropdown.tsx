import { useState, useEffect, useMemo, useRef } from "react";
import type { CategoryResponseDto } from "../../services/product";
import styles from "./SearchableCategoryDropdown.module.css";

interface Props {
  value: string;
  onChange: (val: string) => void;
  categories: CategoryResponseDto[];
  onManageCategories?: () => void;
  error?: string;
  placeholder?: string;
}

export function SearchableCategoryDropdown({
  value,
  onChange,
  categories,
  onManageCategories,
  error,
  placeholder = "-- Chọn danh mục --",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter((cat) => cat.name.toLowerCase().includes(q));
  }, [categories, search]);

  const selectedCategory = categories.find((c) => String(c.id) === value);

  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      <div
        className={styles.dropdownTrigger}
        onClick={() => setIsOpen(!isOpen)}
        style={{ borderColor: error ? "var(--color-danger)" : undefined }}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setIsOpen(!isOpen)}
      >
        <span className={!selectedCategory ? styles.placeholder : ""}>
          {selectedCategory ? selectedCategory.name : placeholder}
        </span>
        <i className={`fi fi-rr-angle-small-${isOpen ? "up" : "down"}`} />
      </div>

      {isOpen && (
        <div className={styles.dropdownMenu} role="listbox">
          <div className={styles.dropdownSearchWrapper}>
            <i className="fi fi-rr-search" />
            <input
              type="text"
              className={styles.dropdownSearchInput}
              placeholder="Tìm danh mục..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className={styles.dropdownList}>
            {filtered.map((cat) => {
              const isSelected = String(cat.id) === value;
              return (
                <div
                  key={cat.id}
                  role="option"
                  aria-selected={isSelected}
                  className={[styles.dropdownItem, isSelected ? styles.activeItem : ""].join(" ")}
                  onClick={() => {
                    onChange(String(cat.id));
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  <span>{cat.name}</span>
                  {isSelected && (
                    <div className={styles.checkmarkWrapper}>
                      <i className="fi fi-rr-check" />
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className={styles.noResults}>Không tìm thấy danh mục</div>
            )}
          </div>

          {onManageCategories && (
            <div
              className={styles.dropdownManageBtn}
              onClick={(e) => {
                e.stopPropagation();
                onManageCategories();
                setIsOpen(false);
              }}
            >
              <i className="fi fi-rr-settings-sliders" />
              <span>Quản lý danh mục</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
