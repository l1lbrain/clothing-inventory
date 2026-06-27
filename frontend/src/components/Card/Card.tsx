import type { ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps {
  children: ReactNode;
  className?: string;
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={[styles.card, className ?? ""].join(" ")}>{children}</div>
  );
}

export function CardHeader({ title, subtitle, actions }: CardHeaderProps) {
  return (
    <div className={styles.cardHeader}>
      <div>
        <h3 className={styles.cardTitle}>{title}</h3>
        {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.cardActions}>{actions}</div>}
    </div>
  );
}

export function CardBody({ children, className }: CardProps) {
  return (
    <div className={[styles.cardBody, className ?? ""].join(" ")}>
      {children}
    </div>
  );
}
