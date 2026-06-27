import { apiFetch } from "./api";
import type { Product, ProductCategory, Variant } from "../types/product.types";

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface VariantResponseDto {
  id: number;
  productId: number;
  sku: string;
  purchasePrice: number;
  salePrice: number;
  quantityOnHand: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  attributes?: Record<string, string>;
}

export interface ProductVariantDetailResponseDto {
  variantId: number;
  sku: string;
  purchasePrice: number;
  salePrice: number;
  quantityOnHand: number;
  status: string;
  productId: number;
  productName: string;
  productCode: string;
  brand?: string;
  description?: string;
  categoryName: string;
  attributes?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductResponseDto {
  id: number;
  code: string;
  name: string;
  categoryName: string;
  brand?: string;
  unit?: string;
  description?: string;
  option1Name?: string;
  option2Name?: string;
  option3Name?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  variants?: VariantResponseDto[];
}

export interface PaginatedProductsResponse {
  items: ProductResponseDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PaginatedProducts {
  items: Product[];
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

function getAttributeValue(
  attributes: Record<string, string> | undefined,
  keywords: string[],
): string {
  if (!attributes) return "";
  for (const key of Object.keys(attributes)) {
    const lowerKey = key.toLowerCase();
    if (keywords.some((kw) => lowerKey.includes(kw))) {
      return attributes[key];
    }
  }
  return "";
}

function mapBackendCategoryToFrontend(categoryName: string): {
  category: ProductCategory;
  categoryLabel: string;
} {
  if (!categoryName) {
    return { category: "ao", categoryLabel: "Áo" };
  }
  const name = categoryName.toLowerCase();
  if (name.includes("áo") || name.includes("ao"))
    return { category: "ao", categoryLabel: "Áo" };
  if (name.includes("quần") || name.includes("quan"))
    return { category: "quan", categoryLabel: "Quần" };
  if (name.includes("đầm") || name.includes("dam"))
    return { category: "dam", categoryLabel: "Đầm" };
  if (name.includes("váy") || name.includes("vay"))
    return { category: "vay", categoryLabel: "Váy" };
  if (name.includes("giày") || name.includes("giay"))
    return { category: "giay", categoryLabel: "Giày" };
  return { category: "phu_kien", categoryLabel: categoryName };
}

export function mapBackendVariantToFrontend(v: VariantResponseDto): Variant {
  const size = getAttributeValue(v.attributes, [
    "size",
    "kích thước",
    "kich thuoc",
  ]);
  const color = getAttributeValue(v.attributes, [
    "color",
    "màu sắc",
    "mau sac",
    "màu",
    "mau",
  ]);
  const material = getAttributeValue(v.attributes, [
    "material",
    "chất liệu",
    "chat lieu",
  ]);

  return {
    id: String(v.id),
    sku: v.sku,
    importPrice: v.purchasePrice,
    salePrice: v.salePrice,
    stock: v.quantityOnHand || 0,
    size,
    color,
    material,
    note: "",
  };
}

export function mapBackendProductToFrontend(p: ProductResponseDto): Product {
  const { category, categoryLabel } = mapBackendCategoryToFrontend(
    p.categoryName,
  );
  const variants = p.variants
    ? p.variants.map(mapBackendVariantToFrontend)
    : [];

  // Tổng tồn kho
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);

  // Khoảng giá
  const importPrices = variants.map((v) => v.importPrice);
  const salePrices = variants.map((v) => v.salePrice);
  const minImportPrice = importPrices.length ? Math.min(...importPrices) : 0;
  const minSalePrice = salePrices.length ? Math.min(...salePrices) : 0;

  // Tóm tắt thuộc tính
  const uniqueSizes = Array.from(
    new Set(variants.map((v) => v.size).filter(Boolean)),
  );
  const uniqueColors = Array.from(
    new Set(variants.map((v) => v.color).filter(Boolean)),
  );
  const uniqueMaterials = Array.from(
    new Set(variants.map((v) => v.material).filter(Boolean)),
  );

  const sizeLabel =
    uniqueSizes.length > 1 ? "Nhiều kích thước" : uniqueSizes[0] || "—";
  const colorLabel =
    uniqueColors.length > 1 ? "Nhiều màu sắc" : uniqueColors[0] || "—";
  const materialLabel =
    uniqueMaterials.length > 1 ? "Nhiều chất liệu" : uniqueMaterials[0] || "—";

  return {
    id: String(p.id),
    code: p.code,
    sku: p.code,
    name: p.name,
    category,
    categoryLabel,
    importPrice: minImportPrice,
    salePrice: minSalePrice,
    unit: p.unit || "Cái",
    stock: totalStock,
    description: p.description || "",
    image: "",
    createdAt: p.createdAt ? p.createdAt.split("T")[0] : "",
    updatedAt: p.updatedAt ? p.updatedAt.split("T")[0] : "",
    size: sizeLabel,
    color: colorLabel,
    material: materialLabel,
    brand: p.brand || "",
    variants,
  };
}

export async function getProductsPage(
  page: number,
  keyword?: string,
): Promise<PaginatedProducts> {
  const url = keyword
    ? `/products?page=${page}&keyword=${encodeURIComponent(keyword)}`
    : `/products?page=${page}`;

  const response = await apiFetch<ApiResponse<PaginatedProductsResponse>>(url);
  const data = response.data;

  const allProducts: Product[] = [];
  if (data.items) {
    data.items.forEach((item) => {
      allProducts.push(mapBackendProductToFrontend(item));
    });
  }

  return {
    items: allProducts,
    page: data.page,
    pageSize: data.size,
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}

export interface VariantCreateRequestDto {
  option1Value: string | null;
  option2Value: string | null;
  option3Value: string | null;
  purchasePrice: number;
  salePrice: number;
}

export interface ProductCreateRequestDto {
  name: string;
  categoryId: number;
  brand: string;
  unit: string;
  description: string;
  option1Name: string | null;
  option2Name: string | null;
  option3Name: string | null;
  variants: VariantCreateRequestDto[];
}

export interface CategoryResponseDto {
  id: number;
  code: string;
  name: string;
  status: string;
}

export async function createProduct(
  payload: ProductCreateRequestDto,
): Promise<ProductResponseDto> {
  const response = await apiFetch<ApiResponse<ProductResponseDto>>(
    "/products",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}

export async function getCategories(): Promise<CategoryResponseDto[]> {
  const response =
    await apiFetch<ApiResponse<CategoryResponseDto[]>>("/categories");
  return response.data;
}
