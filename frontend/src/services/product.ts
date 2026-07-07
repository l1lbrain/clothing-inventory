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
  // Backend trả về attributes dạng Map<optionName, optionValue>
  // Ví dụ: { "Màu sắc": "Đỏ", "Kích thước": "M" }
  // Không có option1Value/2/3Value riêng lẻ
  attributes?: Record<string, string>;
  hasTransactions?: boolean;
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

function mapBackendCategoryToFrontend(categoryName: string): {
  category: ProductCategory;
  categoryLabel: string;
} {
  return {
    category: "phu_kien",
    categoryLabel: categoryName || "—",
  };
}

export function mapBackendVariantToFrontend(
  v: VariantResponseDto,
  option1Name?: string | null,
  option2Name?: string | null,
  option3Name?: string | null,
): Variant {
  // Backend trả về attributes dạng Map<optionName, optionValue>
  // Ví dụ: { "Màu sắc": "Đỏ", "Kích thước": "M" }
  // Tra cứu giá trị theo đúng tên thuộc tính người dùng đã định nghĩa
  const attrs = v.attributes ?? {};
  const option1Value = (option1Name ? (attrs[option1Name] ?? null) : null);
  const option2Value = (option2Name ? (attrs[option2Name] ?? null) : null);
  const option3Value = (option3Name ? (attrs[option3Name] ?? null) : null);

  return {
    id: String(v.id),
    sku: v.sku,
    importPrice: v.purchasePrice,
    salePrice: v.salePrice,
    stock: v.quantityOnHand || 0,
    note: "",
    status: v.status,
    option1Value,
    option2Value,
    option3Value,
    hasTransactions: v.hasTransactions || false,
  };
}

export function mapBackendProductToFrontend(p: ProductResponseDto): Product {
  const { category, categoryLabel } = mapBackendCategoryToFrontend(
    p.categoryName,
  );
  const variants = p.variants
    ? p.variants.map((v) => mapBackendVariantToFrontend(v, p.option1Name, p.option2Name, p.option3Name))
    : [];

  // Tổng tồn kho
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);

  // Khoảng giá
  const importPrices = variants.map((v) => v.importPrice);
  const salePrices = variants.map((v) => v.salePrice);
  const minImportPrice = importPrices.length ? Math.min(...importPrices) : 0;
  const minSalePrice = salePrices.length ? Math.min(...salePrices) : 0;

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
  status?: string,
  sortBy?: string,
  sortDir?: "asc" | "desc",
): Promise<PaginatedProducts> {
  const params = new URLSearchParams({ page: String(page) });
  if (keyword) params.set("keyword", keyword);
  if (status) params.set("status", status.toUpperCase());
  if (sortBy) params.set("sortBy", sortBy);
  if (sortDir) params.set("sortDirection", sortDir);
  const url = `/products?${params.toString()}`;

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

export interface PaginatedLowStock {
  items: ProductVariantDetailResponseDto[];
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

export async function getLowStockVariantsPage(
  page: number,
  keyword?: string,
  status?: string,
  sortBy?: string,
  sortDir?: "asc" | "desc",
): Promise<PaginatedLowStock> {
  const params = new URLSearchParams({ page: String(page) });
  if (keyword) params.set("keyword", keyword);
  if (status) params.set("status", status.toUpperCase());
  if (sortBy) params.set("sortBy", sortBy);
  if (sortDir) params.set("sortDirection", sortDir);

  const url = `/products/variants/low-stock?${params.toString()}`;
  const response = await apiFetch<ApiResponse<{
    items: ProductVariantDetailResponseDto[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  }>>(url);
  const data = response.data;

  return {
    items: data.items ?? [],
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
  quantityOnHand?: number | null;
  adjustReason?: string | null;
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

