import { createContext, useContext } from "react";

export type ToastType = "success" | "warning" | "error";

export interface ToastContextProps {
  showToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextProps | undefined>(
  undefined,
);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
