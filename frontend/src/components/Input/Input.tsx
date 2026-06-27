import { useState, type InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: string;
  suffix?: string;
}

export function Input({
  label,
  error,
  icon,
  suffix,
  id,
  className,
  ...rest
}: InputProps) {
  const isPasswordInput = rest.type === "password";
  const [showPassword, setShowPassword] = useState(false);

  const inputType = isPasswordInput
    ? showPassword
      ? "text"
      : "password"
    : rest.type;

  return (
    <div className={styles.formGroup}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
          {rest.required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.inputWrapper}>
        {icon && <i className={[icon, styles.icon].join(" ")} aria-hidden />}
        <input
          {...rest}
          id={id}
          type={inputType}
          className={[
            styles.input,
            icon ? styles.withIcon : "",
            isPasswordInput ? styles.withRightIcon : "",
            suffix ? styles.withSuffix : "",
            error ? styles.hasError : "",
            className ?? "",
          ].join(" ")}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
        {isPasswordInput && (
          <button
            type="button"
            className={styles.eyeBtn}
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
          >
            <i
              className={showPassword ? "fi fi-rr-eye-crossed" : "fi fi-rr-eye"}
            />
          </button>
        )}
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
