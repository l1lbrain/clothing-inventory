import { useState, useMemo } from "react";
import { useDebounce } from "./useDebounce";

interface UseSearchReturn<T> {
  query: string;
  setQuery: (q: string) => void;
  filteredItems: T[];
}

export function useSearch<T>(
  items: T[],
  searchKeys: (keyof T)[],
): UseSearchReturn<T> {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const filteredItems = useMemo(() => {
    if (!debouncedQuery.trim()) return items;

    const lower = debouncedQuery.toLowerCase();
    return items.filter((item) =>
      searchKeys.some((key) => {
        const val = item[key];
        return typeof val === "string" && val.toLowerCase().includes(lower);
      }),
    );
  }, [items, debouncedQuery, searchKeys]);

  return { query, setQuery, filteredItems };
}
