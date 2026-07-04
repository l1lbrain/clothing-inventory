export type ProductCategory =
  | "ao"
  | "quan"
  | "dam"
  | "vay"
  | "phu_kien"
  | "giay";

export interface Variant {
  id: string;
  sku: string;
  importPrice: number;
  salePrice: number;
  stock: number;
  note?: string;
  status?: string;
  option1Value?: string | null;
  option2Value?: string | null;
  option3Value?: string | null;
  hasTransactions?: boolean;
}

export interface Product {
  id: string;
  code: string;
  sku: string;
  name: string;
  category: ProductCategory;
  categoryLabel: string;
  importPrice: number;
  salePrice: number;
  unit: string;
  stock: number;
  description: string;
  image: string;
  createdAt: string;
  updatedAt: string;
  brand?: string;
  status?: string;
  variants: Variant[];
  option1Name?: string | null;
  option2Name?: string | null;
  option3Name?: string | null;
}

export interface ProductFormData {
  code?: string;
  sku?: string;
  name: string;
  category: string;
  importPrice: number | string;
  salePrice: number | string;
  unit: string;
  description: string;
  image: string;
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
}
