import styles from "./ConfirmDialog.module.css";
import { Button } from "../Button/Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="alertdialog"
      aria-modal
      aria-label={title}
    >
      <div className={styles.dialog}>
        <div className={[styles.iconWrap, styles[variant]].join(" ")}>
          <i
            className={
              variant === "danger"
                ? "fi fi-rr-triangle-warning"
                : "fi fi-rr-info"
            }
            aria-hidden
          />
        </div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
