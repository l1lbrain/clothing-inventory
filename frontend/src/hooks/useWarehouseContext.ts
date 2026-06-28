import { useContext } from "react";
import { WarehouseContext } from "../context/WarehouseContext";
import type { WarehouseContextValue } from "../context/WarehouseContext";

export function useWarehouseContext(): WarehouseContextValue {
  const ctx = useContext(WarehouseContext);
  if (!ctx) throw new Error("useWarehouseContext must be used inside WarehouseContextProvider");
  return ctx;
}
