import type { SelectHTMLAttributes } from "react";
import type { SelectOption } from "../../types/common.types";
import styles from "./Select.module.css";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  error,
  options,
  placeholder,
  id,
  className,
  ...rest
}: SelectProps) {
  return (
    <div className={styles.formGroup}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
          {rest.required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.selectWrapper}>
        <select
          id={id}
          className={[
            styles.select,
            error ? styles.hasError : "",
            className ?? "",
          ].join(" ")}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <i className="fi fi-rr-angle-small-down" aria-hidden />
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
