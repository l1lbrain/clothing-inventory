import { apiFetch } from "./api";
import type { Product, ProductCategory, Variant } from "../types/product.types";
import type { ApiResponse } from "../types/common.types";

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
  option1Value?: string | null;
  option2Value?: string | null;
  option3Value?: string | null;
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
  return {
    category: "phu_kien",
    categoryLabel: categoryName || "—",
  };
}

export function mapBackendVariantToFrontend(v: VariantResponseDto, p?: ProductResponseDto): Variant {
  const option1Value = p?.option1Name && v.attributes ? v.attributes[p.option1Name] : null;
  const option2Value = p?.option2Name && v.attributes ? v.attributes[p.option2Name] : null;
  const option3Value = p?.option3Name && v.attributes ? v.attributes[p.option3Name] : null;

  let size = getAttributeValue(v.attributes, [
    "size",
    "kích thước",
    "kich thuoc",
  ]);
  let color = getAttributeValue(v.attributes, [
    "color",
    "màu sắc",
    "mau sac",
    "màu",
    "mau",
  ]);
  let material = getAttributeValue(v.attributes, [
    "material",
    "chất liệu",
    "chat lieu",
  ]);

  // Map option values to corresponding size/color/material using option names
  if (p) {
    const checkOpt = (name: string | undefined, val: string | null | undefined) => {
      if (!name || !val) return;
      const lower = name.toLowerCase();
      if (lower.includes("kích thước") || lower.includes("kich thuoc") || lower.includes("size")) {
        size = val;
      } else if (lower.includes("màu") || lower.includes("mau") || lower.includes("color")) {
        color = val;
      } else if (lower.includes("chất liệu") || lower.includes("chat lieu") || lower.includes("material")) {
        material = val;
      }
    };
    checkOpt(p.option1Name, option1Value);
    checkOpt(p.option2Name, option2Value);
    checkOpt(p.option3Name, option3Value);
  }

  return {
    id: String(v.id),
    sku: v.sku,
    importPrice: v.purchasePrice,
    salePrice: v.salePrice,
    stock: v.quantityOnHand || 0,
    size: size || "",
    color: color || "",
    material: material || "",
    note: "",
    status: v.status,
    option1Value,
    option2Value,
    option3Value,
  };
}

export function mapBackendProductToFrontend(p: ProductResponseDto): Product {
  const { category, categoryLabel } = mapBackendCategoryToFrontend(
    p.categoryName,
  );
  const variants = p.variants
    ? p.variants.map((v) => mapBackendVariantToFrontend(v, p))
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
    createdAt: p.createdAt || "",
    updatedAt: p.updatedAt || "",
    size: sizeLabel,
    color: colorLabel,
    material: materialLabel,
    brand: p.brand || "",
    status: p.status,
    variants,
    option1Name: p.option1Name,
    option2Name: p.option2Name,
    option3Name: p.option3Name,
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

// Xóa sản phẩm theo id
export async function deleteProduct(id: string): Promise<void> {
  await apiFetch<void>(`/products/${id}`, { method: "DELETE" });
}

// Xóa các phiên bản (variants)
export async function deleteVariants(ids: string[]): Promise<void> {
  await apiFetch<void>("/products/variants", {
    method: "DELETE",
    body: JSON.stringify({ variantIds: ids.map(Number) }),
  });
}

// Xóa một phiên bản (variant) theo id
export async function deleteVariant(id: string): Promise<void> {
  await deleteVariants([id]);
}

export interface VariantUpdateItemPayload {
  id?: number | null;
  sku?: string | null;
  option1Value?: string | null;
  option2Value?: string | null;
  option3Value?: string | null;
  purchasePrice: number;
  salePrice: number;
  status: string;
}

export interface ProductUpdatePayload {
  name?: string;
  categoryId?: number;
  brand?: string;
  unit?: string;
  description?: string;
  status?: string;
  option1Name?: string | null;
  option2Name?: string | null;
  option3Name?: string | null;
  variants?: VariantUpdateItemPayload[];
}

// Cập nhật sản phẩm dùng PUT
export async function updateProduct(
  id: string,
  payload: ProductUpdatePayload
): Promise<ProductResponseDto> {
  const response = await apiFetch<ApiResponse<ProductResponseDto>>(
    `/products/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
  return response.data;
}

// Cập nhật sản phẩm dùng PATCH
export async function patchProduct(
  id: string,
  payload: Partial<ProductUpdatePayload>
): Promise<ProductResponseDto> {
  const response = await apiFetch<ApiResponse<ProductResponseDto>>(
    `/products/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
  return response.data;
}

export interface BulkUpdatePricePayload {
  variantIds: number[];
  purchasePrice?: number | null;
  salePrice?: number | null;
  status?: string | null;
}

// Cập nhật giá hàng loạt cho các phiên bản
export async function bulkUpdateVariantPrices(
  payload: BulkUpdatePricePayload
): Promise<void> {
  await apiFetch<void>("/products/variants/bulk-update-price", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export interface VariantUpdatePayload {
  option1Value: string | null;
  option2Value: string | null;
  option3Value: string | null;
  purchasePrice: number;
  salePrice: number;
  status: string;
}

export async function updateVariant(
  id: string,
  payload: VariantUpdatePayload
): Promise<ProductResponseDto> {
  const response = await apiFetch<ApiResponse<ProductResponseDto>>(
    `/products/variants/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
  return response.data;
}

