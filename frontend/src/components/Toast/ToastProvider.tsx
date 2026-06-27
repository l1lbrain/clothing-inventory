import { useState, useCallback, type ReactNode } from "react";
import { ToastContext, type ToastType } from "./ToastContext";
import styles from "./Toast.module.css";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  isExiting: boolean;
}

function ToastItem({
  message,
  type,
  onClose,
  isExiting,
}: {
  message: string;
  type: ToastType;
  onClose: () => void;
  isExiting: boolean;
}) {
  const getIcon = () => {
    switch (type) {
      case "success":
        return "fi fi-rr-check-circle";
      case "warning":
        return "fi fi-rr-exclamation";
      case "error":
        return "fi fi-rr-cross-circle";
    }
  };

  return (
    <div
      className={[
        styles.toast,
        styles[type],
        isExiting ? styles.exiting : "",
      ].join(" ")}
      role="alert"
    >
      <div className={styles.icon}>
        <i className={getIcon()} />
      </div>
      <div className={styles.message}>{message}</div>
      <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
        <i className="fi fi-rr-cross-small" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t)),
    );

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = Math.random().toString(36).substring(2, 9);

      setToasts((prev) => [...prev, { id, message, type, isExiting: false }]);

      setTimeout(() => {
        removeToast(id);
      }, 3000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={styles.toastContainer}>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            message={toast.message}
            type={toast.type}
            isExiting={toast.isExiting}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
