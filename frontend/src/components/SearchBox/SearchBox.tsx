import type { InputHTMLAttributes } from "react";
import styles from "./SearchBox.module.css";

interface SearchBoxProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export function SearchBox({ onClear, value, ...rest }: SearchBoxProps) {
  return (
    <div className={styles.wrapper}>
      <i className="fi fi-rr-search" aria-hidden />
      <input className={styles.input} type="search" value={value} {...rest} />
      {value && onClear && (
        <button
          className={styles.clearBtn}
          onClick={onClear}
          aria-label="Xóa tìm kiếm"
          type="button"
        >
          <i className="fi fi-rr-cross-small" aria-hidden />
        </button>
      )}
    </div>
  );
}
