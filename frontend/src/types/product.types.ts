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
  size?: string;
  color?: string;
  material?: string;
  note?: string;
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
  size?: string;
  color?: string;
  material?: string;
  brand?: string;
  variants: Variant[];
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
