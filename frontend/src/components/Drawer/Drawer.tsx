import type { ReactNode } from "react";
import { useEffect } from "react";
import styles from "./Drawer.module.css";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Drawer({ isOpen, onClose, children }: DrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <div
        className={[styles.overlay, isOpen ? styles.overlayVisible : ""].join(
          " ",
        )}
        onClick={onClose}
      />
      <aside className={[styles.drawer, isOpen ? styles.open : ""].join(" ")}>
        {children}
      </aside>
    </>
  );
}
