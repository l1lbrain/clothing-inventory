import { createApi } from "@reduxjs/toolkit/query/react";
import { apiFetch } from "../services/api";
import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import type { Product } from "../types/product.types";
import type { PurchaseOrder } from "../types/purchaseOrder.types";
import type {
  ProductCreateRequestDto,
  ProductUpdatePayload,
  VariantUpdatePayload,
  BulkUpdatePricePayload,
  CategoryResponseDto,
  ProductResponseDto,
  PaginatedProducts,
} from "../services/product";
import {
  mapBackendProductToFrontend,
} from "../services/product";
import type { ApiResponse } from "../types/common.types";
import type {
  PaginatedPurchaseOrders,
  PurchaseOrderCreateRequestDto,
} from "../services/purchaseOrder";
import {
  mapBackendOrderToFrontend,
  type PaginatedPurchaseOrdersResponse,
  type BackendPurchaseOrderResponse,
} from "../services/purchaseOrder";
import type { PaginatedSuppliers } from "../services/supplier";
import {
  mapBackendSupplierToFrontend,
  type PaginatedSuppliersResponse,
  type BackendSupplierResponse,
} from "../services/supplier";
import type { Supplier, SupplierFormData } from "../types/supplier.types";
import type { PaginatedUsers, UserResponse, RegisterRequest, UserUpdateRequest } from "../services/auth";
import type {
  PaymentMethod,
  PaymentRecord,
  PaginatedPayments,
  PaymentCreateRequestDto,
  BackendPaymentMethodResponse,
  BackendPaymentResponse,
  PaginatedPaymentsResponse,
} from "../services/payment";
import type { DashboardResponseDto } from "../services/dashboard";
import type { ProductVariantDetailResponseDto, PaginatedLowStock } from "../services/product";
import type { InventoryTransactionDto } from "../services/inventoryTransaction";

// ─── Base Query wrapping apiFetch ──────────────────────────────────────────────
const apiFetchBaseQuery: BaseQueryFn<
  { path: string; options?: RequestInit },
  unknown,
  { status: number; message: string }
> = async ({ path, options = {} }) => {
  try {
    const data = await apiFetch<unknown>(path, options);
    return { data };
  } catch (err) {
    if (err instanceof Error) {
      const apiErr = err as Error & { status?: number };
      return {
        error: {
          status: apiErr.status ?? 500,
          message: err.message,
        },
      };
    }
    return { error: { status: 500, message: "Unknown error" } };
  }
};

// ─── RTK Query API ──────────────────────────────────────────────────────────────
export const api = createApi({
  reducerPath: "api",
  baseQuery: apiFetchBaseQuery,
  tagTypes: [
    "Products",
    "Variants",
    "Categories",
    "PurchaseOrders",
    "Suppliers",
    "Users",
    "PaymentMethods",
    "Payments",
    "Dashboard",
    "Transactions",
    "LowStock",
  ],
  endpoints: (builder) => ({

    // ─── Products ──────────────────────────────────────────────────────────────
    getProductsPage: builder.query<
      PaginatedProducts,
      { page: number; keyword?: string; status?: string; sortBy?: string; sortDir?: "asc" | "desc" }
    >({
      query: ({ page, keyword, status, sortBy, sortDir }) => {
        const params = new URLSearchParams({ page: String(page) });
        if (keyword) params.set("keyword", keyword);
        if (status) params.set("status", status.toUpperCase());
        if (sortBy) params.set("sortBy", sortBy);
        if (sortDir) params.set("sortDirection", sortDir);
        return { path: `/products?${params.toString()}` };
      },
      transformResponse: (raw: ApiResponse<{ items: ProductResponseDto[]; page: number; size: number; totalElements: number; totalPages: number }>) => ({
        items: (raw.data.items || []).map(mapBackendProductToFrontend),
        page: raw.data.page,
        pageSize: raw.data.size,
        totalElements: raw.data.totalElements,
        totalPages: raw.data.totalPages,
      }),
      providesTags: ["Products"],
    }),

    getProductsAllVariantsFlat: builder.query<Product[], void>({
      query: () => ({ path: "/products?page=1&size=9999" }),
      transformResponse: async (raw: ApiResponse<{ items: ProductResponseDto[]; totalPages: number }>) => {
        // Flatten tất cả variants thành danh sách phẳng (dùng cho dropdown chọn biến thể)
        const allProducts = (raw.data.items || []).map(mapBackendProductToFrontend);
        return allProducts
          .filter((p) => !p.status || p.status.toUpperCase() === "ACTIVE")
          .flatMap((p) =>
            (p.variants || [])
              .filter((v) => !v.status || v.status.toUpperCase() === "ACTIVE")
              .map((v) => ({
                ...p,
                id: String(v.id),
                sku: v.sku,
                importPrice: v.importPrice,
                salePrice: v.salePrice,
                stock: v.stock,
                option1Value: v.option1Value,
                option2Value: v.option2Value,
                option3Value: v.option3Value,
                variants: [],
              })),
          );
      },
      providesTags: ["Products"],
    }),

    createProduct: builder.mutation<ProductResponseDto, ProductCreateRequestDto>({
      query: (payload) => ({
        path: "/products",
        options: { method: "POST", body: JSON.stringify(payload) },
      }),
      transformResponse: (raw: ApiResponse<ProductResponseDto>) => raw.data,
      invalidatesTags: ["Products"],
    }),

    updateProduct: builder.mutation<Product, { id: string; payload: ProductUpdatePayload }>({
      query: ({ id, payload }) => ({
        path: `/products/${id}`,
        options: { method: "PUT", body: JSON.stringify(payload) },
      }),
      transformResponse: (raw: ApiResponse<ProductResponseDto>) => mapBackendProductToFrontend(raw.data),
      invalidatesTags: ["Products"],
    }),

    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        path: `/products/${id}`,
        options: { method: "DELETE" },
      }),
      invalidatesTags: ["Products"],
    }),

    // ─── Variants ─────────────────────────────────────────────────────────────
    updateVariant: builder.mutation<Product, { id: string; payload: VariantUpdatePayload }>({
      query: ({ id, payload }) => ({
        path: `/products/variants/${id}`,
        options: { method: "PUT", body: JSON.stringify(payload) },
      }),
      transformResponse: (raw: ApiResponse<ProductResponseDto>) => mapBackendProductToFrontend(raw.data),
      invalidatesTags: ["Products", "Variants", "Transactions"],
    }),

    deleteVariants: builder.mutation<void, string[]>({
      query: (ids) => ({
        path: "/products/variants",
        options: { method: "DELETE", body: JSON.stringify({ variantIds: ids.map(Number) }) },
      }),
      invalidatesTags: ["Products", "Variants"],
    }),

    bulkUpdateVariantPrices: builder.mutation<void, BulkUpdatePricePayload>({
      query: (payload) => ({
        path: "/products/variants/bulk-update-price",
        options: { method: "PUT", body: JSON.stringify(payload) },
      }),
      invalidatesTags: ["Products", "Variants"],
    }),

    getVariantById: builder.query<ProductVariantDetailResponseDto, string>({
      query: (id) => ({ path: `/products/variants/${id}` }),
      transformResponse: (raw: ApiResponse<ProductVariantDetailResponseDto>) => raw.data,
      providesTags: ["Variants"],
    }),

    getLowStockVariantsPage: builder.query<
      PaginatedLowStock,
      { page: number; keyword?: string; status?: string; sortBy?: string; sortDir?: "asc" | "desc" }
    >({
      query: ({ page, keyword, status, sortBy, sortDir }) => {
        const params = new URLSearchParams({ page: String(page) });
        if (keyword) params.set("keyword", keyword);
        if (status) params.set("status", status.toUpperCase());
        if (sortBy) params.set("sortBy", sortBy);
        if (sortDir) params.set("sortDirection", sortDir);
        return { path: `/products/variants/low-stock?${params.toString()}` };
      },
      transformResponse: (raw: ApiResponse<{ items: ProductVariantDetailResponseDto[]; page: number; size: number; totalElements: number; totalPages: number }>) => ({
        items: raw.data.items ?? [],
        page: raw.data.page,
        pageSize: raw.data.size,
        totalElements: raw.data.totalElements,
        totalPages: raw.data.totalPages,
      }),
      providesTags: ["LowStock"],
    }),

    // ─── Categories ───────────────────────────────────────────────────────────
    getCategories: builder.query<CategoryResponseDto[], void>({
      query: () => ({ path: "/categories" }),
      transformResponse: (raw: ApiResponse<CategoryResponseDto[]>) => raw.data,
      providesTags: ["Categories"],
    }),

    createCategory: builder.mutation<CategoryResponseDto, string>({
      query: (name) => ({
        path: "/categories",
        options: { method: "POST", body: JSON.stringify({ name }) },
      }),
      transformResponse: (raw: ApiResponse<CategoryResponseDto>) => raw.data,
      invalidatesTags: ["Categories"],
    }),

    updateCategory: builder.mutation<CategoryResponseDto, { id: number; name: string }>({
      query: ({ id, name }) => ({
        path: `/categories/${id}`,
        options: { method: "PUT", body: JSON.stringify({ name }) },
      }),
      transformResponse: (raw: ApiResponse<CategoryResponseDto>) => raw.data,
      invalidatesTags: ["Categories"],
    }),

    deleteCategory: builder.mutation<void, number>({
      query: (id) => ({
        path: `/categories/${id}`,
        options: { method: "DELETE" },
      }),
      invalidatesTags: ["Categories"],
    }),

    restoreCategory: builder.mutation<CategoryResponseDto, string>({
      query: (name) => ({
        path: "/categories/restore",
        options: { method: "PUT", body: JSON.stringify({ name }) },
      }),
      transformResponse: (raw: ApiResponse<CategoryResponseDto>) => raw.data,
      invalidatesTags: ["Categories"],
    }),

    // ─── Purchase Orders ──────────────────────────────────────────────────────
    getPurchaseOrdersPage: builder.query<
      PaginatedPurchaseOrders,
      { page: number; keyword?: string; status?: string; sortBy?: string; sortDir?: "asc" | "desc"; fromDate?: string; toDate?: string; supplierId?: number }
    >({
      query: ({ page, keyword, status, sortBy, sortDir, fromDate, toDate, supplierId }) => {
        const params = new URLSearchParams({ page: String(page) });
        if (keyword) params.set("keyword", keyword);
        if (status) params.set("status", status.toUpperCase());
        if (sortBy) params.set("sortBy", sortBy);
        if (sortDir) params.set("sortDirection", sortDir);
        if (fromDate) params.set("fromDate", fromDate);
        if (toDate) params.set("toDate", toDate);
        if (supplierId) params.set("supplierId", String(supplierId));
        return { path: `/purchase-orders?${params.toString()}` };
      },
      transformResponse: (raw: ApiResponse<PaginatedPurchaseOrdersResponse>) => ({
        items: (raw.data.items || []).map(mapBackendOrderToFrontend),
        page: raw.data.page,
        pageSize: raw.data.size,
        totalElements: raw.data.totalElements,
        totalPages: raw.data.totalPages,
      }),
      providesTags: ["PurchaseOrders"],
    }),

    getReceivedPurchaseOrdersPage: builder.query<
      PaginatedPurchaseOrders,
      { page: number; keyword?: string; sortBy?: string; sortDir?: "asc" | "desc"; fromDate?: string; toDate?: string; supplierId?: number }
    >({
      query: ({ page, keyword, sortBy, sortDir, fromDate, toDate, supplierId }) => {
        const params = new URLSearchParams({ page: String(page) });
        if (keyword) params.set("keyword", keyword);
        if (sortBy) params.set("sortBy", sortBy);
        if (sortDir) params.set("sortDirection", sortDir);
        if (fromDate) params.set("fromDate", fromDate);
        if (toDate) params.set("toDate", toDate);
        if (supplierId) params.set("supplierId", String(supplierId));
        return { path: `/purchase-orders/received?${params.toString()}` };
      },
      transformResponse: (raw: ApiResponse<PaginatedPurchaseOrdersResponse>) => ({
        items: (raw.data.items || []).map(mapBackendOrderToFrontend),
        page: raw.data.page,
        pageSize: raw.data.size,
        totalElements: raw.data.totalElements,
        totalPages: raw.data.totalPages,
      }),
      providesTags: ["PurchaseOrders"],
    }),

    createPurchaseOrder: builder.mutation<PurchaseOrder, PurchaseOrderCreateRequestDto>({
      query: (payload) => ({
        path: "/purchase-orders",
        options: { method: "POST", body: JSON.stringify(payload) },
      }),
      transformResponse: (raw: ApiResponse<BackendPurchaseOrderResponse>) =>
        mapBackendOrderToFrontend(raw.data),
      invalidatesTags: ["PurchaseOrders"],
    }),

    updatePurchaseOrder: builder.mutation<PurchaseOrder, { id: string; payload: PurchaseOrderCreateRequestDto }>({
      query: ({ id, payload }) => ({
        path: `/purchase-orders/${id}`,
        options: { method: "PUT", body: JSON.stringify(payload) },
      }),
      transformResponse: (raw: ApiResponse<BackendPurchaseOrderResponse>) =>
        mapBackendOrderToFrontend(raw.data),
      invalidatesTags: ["PurchaseOrders"],
    }),

    updatePurchaseOrderStatus: builder.mutation<PurchaseOrder, { id: string; status: string }>({
      query: ({ id, status }) => ({
        path: `/purchase-orders/${id}/status`,
        options: { method: "PATCH", body: JSON.stringify({ status }) },
      }),
      transformResponse: (raw: ApiResponse<BackendPurchaseOrderResponse>) =>
        mapBackendOrderToFrontend(raw.data),
      invalidatesTags: ["PurchaseOrders"],
    }),

    // ─── Suppliers ────────────────────────────────────────────────────────────
    getSuppliersPage: builder.query<
      PaginatedSuppliers,
      { page: number; keyword?: string; status?: string; sortBy?: string; sortDir?: "asc" | "desc" }
    >({
      query: ({ page, keyword, status, sortBy, sortDir }) => {
        const params = new URLSearchParams({ page: String(page) });
        if (keyword) params.set("keyword", keyword);
        if (status) params.set("status", status.toUpperCase());
        if (sortBy) params.set("sortBy", sortBy);
        if (sortDir) params.set("sortDirection", sortDir);
        return { path: `/suppliers?${params.toString()}` };
      },
      transformResponse: (raw: ApiResponse<PaginatedSuppliersResponse>) => ({
        items: raw.data.items.map(mapBackendSupplierToFrontend),
        page: raw.data.page,
        pageSize: raw.data.size,
        totalElements: raw.data.totalElements,
        totalPages: raw.data.totalPages,
      }),
      providesTags: ["Suppliers"],
    }),

    getSuppliersAll: builder.query<Supplier[], void>({
      query: () => ({ path: "/suppliers/all" }),
      transformResponse: (raw: ApiResponse<BackendSupplierResponse[]>) =>
        raw.data.map(mapBackendSupplierToFrontend),
      providesTags: ["Suppliers"],
    }),

    createSupplier: builder.mutation<Supplier, SupplierFormData>({
      query: (form) => ({
        path: "/suppliers",
        options: {
          method: "POST",
          body: JSON.stringify({
            name: form.companyName,
            contactPerson: form.representative,
            phone: form.phone,
            email: form.email,
            address: form.address,
            taxCode: form.taxCode,
            note: form.note,
            status: form.status?.toUpperCase() || "ACTIVE",
          }),
        },
      }),
      transformResponse: (raw: ApiResponse<BackendSupplierResponse>) =>
        mapBackendSupplierToFrontend(raw.data),
      invalidatesTags: ["Suppliers"],
    }),

    updateSupplier: builder.mutation<Supplier, { code: string; form: SupplierFormData }>({
      query: ({ code, form }) => ({
        path: `/suppliers/${code}`,
        options: {
          method: "PUT",
          body: JSON.stringify({
            code,
            name: form.companyName,
            contactPerson: form.representative,
            phone: form.phone,
            email: form.email,
            address: form.address,
            taxCode: form.taxCode,
            note: form.note,
            status: form.status?.toUpperCase() || "ACTIVE",
          }),
        },
      }),
      transformResponse: (raw: ApiResponse<BackendSupplierResponse>) =>
        mapBackendSupplierToFrontend(raw.data),
      invalidatesTags: ["Suppliers"],
    }),

    patchSupplier: builder.mutation<Supplier, { code: string; fields: Partial<SupplierFormData> }>({
      query: ({ code, fields }) => {
        const body: Record<string, string> = {};
        if (fields.companyName !== undefined) body.name = fields.companyName;
        if (fields.representative !== undefined) body.contactPerson = fields.representative;
        if (fields.phone !== undefined) body.phone = fields.phone;
        if (fields.email !== undefined) body.email = fields.email;
        if (fields.address !== undefined) body.address = fields.address;
        if (fields.taxCode !== undefined) body.taxCode = fields.taxCode;
        if (fields.note !== undefined) body.note = fields.note;
        if (fields.status !== undefined) body.status = fields.status.toUpperCase();
        return {
          path: `/suppliers/${code}`,
          options: { method: "PATCH", body: JSON.stringify(body) },
        };
      },
      transformResponse: (raw: ApiResponse<BackendSupplierResponse>) =>
        mapBackendSupplierToFrontend(raw.data),
      invalidatesTags: ["Suppliers"],
    }),

    // ─── Users ────────────────────────────────────────────────────────────────
    getUsersPage: builder.query<
      PaginatedUsers,
      { page: number; keyword?: string; status?: string; sortBy?: string; sortDir?: "asc" | "desc" }
    >({
      query: ({ page, keyword, status, sortBy, sortDir }) => {
        const params = new URLSearchParams({ page: String(page) });
        if (keyword) params.set("keyword", keyword.trim());
        if (status) params.set("status", status);
        if (sortBy) params.set("sortBy", sortBy);
        if (sortDir) params.set("sortDirection", sortDir);
        return { path: `/users?${params.toString()}` };
      },
      transformResponse: (raw: ApiResponse<{ items: UserResponse[]; page: number; size: number; totalElements: number; totalPages: number }>) => ({
        items: raw.data.items || [],
        page: raw.data.page,
        pageSize: raw.data.size,
        totalElements: raw.data.totalElements,
        totalPages: raw.data.totalPages,
      }),
      providesTags: ["Users"],
    }),

    registerUser: builder.mutation<void, RegisterRequest>({
      query: (payload) => ({
        path: "/auth/register",
        options: { method: "POST", body: JSON.stringify(payload) },
      }),
      invalidatesTags: ["Users"],
    }),

    updateUser: builder.mutation<UserResponse, { uuid: string; payload: UserUpdateRequest }>({
      query: ({ uuid, payload }) => ({
        path: `/users/${uuid}`,
        options: { method: "PATCH", body: JSON.stringify(payload) },
      }),
      transformResponse: (raw: ApiResponse<UserResponse>) => raw.data,
      invalidatesTags: ["Users"],
    }),

    updateUserRoles: builder.mutation<UserResponse, { uuid: string; roles: string[] }>({
      query: ({ uuid, roles }) => ({
        path: `/users/${uuid}/roles`,
        options: { method: "PUT", body: JSON.stringify({ roles }) },
      }),
      transformResponse: (raw: ApiResponse<UserResponse>) => raw.data,
      invalidatesTags: ["Users"],
    }),

    // ─── Payment Methods ──────────────────────────────────────────────────────
    getPaymentMethods: builder.query<PaymentMethod[], void>({
      query: () => ({ path: "/payment-methods" }),
      transformResponse: (raw: ApiResponse<BackendPaymentMethodResponse[]>) =>
        (raw.data || []).map((m) => ({ id: m.id, code: m.code, name: m.name, status: m.status })),
      providesTags: ["PaymentMethods"],
    }),

    // ─── Payments ─────────────────────────────────────────────────────────────
    createPayment: builder.mutation<PaymentRecord, PaymentCreateRequestDto>({
      query: (payload) => ({
        path: "/payments",
        options: { method: "POST", body: JSON.stringify(payload) },
      }),
      transformResponse: (raw: ApiResponse<BackendPaymentResponse>) => {
        const p = raw.data;
        return {
          id: p.id,
          purchaseOrderId: p.purchaseOrderId,
          purchaseOrderCode: p.purchaseOrderCode,
          paymentMethodId: p.paymentMethodId,
          paymentMethodCode: p.paymentMethodCode,
          paymentMethodName: p.paymentMethodName,
          paymentDate: p.paymentDate,
          amount: Number(p.amount) || 0,
          note: p.note ?? null,
          createdById: p.createdById,
          createdByName: p.createdByName,
          totalPaidAmount: Number(p.totalPaidAmount) || 0,
          remainingAmount: Number(p.remainingAmount) || 0,
          createdAt: p.createdAt,
        };
      },
      invalidatesTags: ["Payments", "PurchaseOrders"],
    }),

    getPaymentHistoryByPurchaseOrderId: builder.query<
      PaginatedPayments,
      { purchaseOrderId: number; page: number }
    >({
      query: ({ purchaseOrderId, page }) => ({
        path: `/payments/purchase-order/${purchaseOrderId}?page=${page}`,
      }),
      transformResponse: (raw: ApiResponse<PaginatedPaymentsResponse>) => {
        const mapPayment = (p: BackendPaymentResponse): PaymentRecord => ({
          id: p.id,
          purchaseOrderId: p.purchaseOrderId,
          purchaseOrderCode: p.purchaseOrderCode,
          paymentMethodId: p.paymentMethodId,
          paymentMethodCode: p.paymentMethodCode,
          paymentMethodName: p.paymentMethodName,
          paymentDate: p.paymentDate,
          amount: Number(p.amount) || 0,
          note: p.note ?? null,
          createdById: p.createdById,
          createdByName: p.createdByName,
          totalPaidAmount: Number(p.totalPaidAmount) || 0,
          remainingAmount: Number(p.remainingAmount) || 0,
          createdAt: p.createdAt,
        });
        return {
          items: (raw.data.items || []).map(mapPayment),
          page: raw.data.page,
          pageSize: raw.data.size,
          totalElements: raw.data.totalElements,
          totalPages: raw.data.totalPages,
        };
      },
      providesTags: ["Payments"],
    }),

    // ─── Dashboard ────────────────────────────────────────────────────────────
    getDashboardStats: builder.query<DashboardResponseDto, void>({
      query: () => ({ path: "/dashboard" }),
      transformResponse: (raw: ApiResponse<DashboardResponseDto>) => raw.data,
      providesTags: ["Dashboard"],
    }),

    // ─── Inventory Transactions ───────────────────────────────────────────────
    getTransactionsByVariantId: builder.query<
      { items: InventoryTransactionDto[]; page: number; pageSize: number; totalElements: number; totalPages: number },
      { variantId: string | number; page: number }
    >({
      query: ({ variantId, page }) => ({
        path: `/inventory-transactions/variant/${variantId}?page=${page}`,
      }),
      transformResponse: (raw: ApiResponse<{ items: InventoryTransactionDto[]; page: number; size: number; totalElements: number; totalPages: number }>) => ({
        items: raw.data.items || [],
        page: raw.data.page,
        pageSize: raw.data.size,
        totalElements: raw.data.totalElements,
        totalPages: raw.data.totalPages,
      }),
      providesTags: ["Transactions"],
    }),
  }),
});

// Export hooks
export const {
  useGetProductsPageQuery,
  useGetProductsAllVariantsFlatQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUpdateVariantMutation,
  useDeleteVariantsMutation,
  useBulkUpdateVariantPricesMutation,
  useGetVariantByIdQuery,
  useGetLowStockVariantsPageQuery,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useRestoreCategoryMutation,
  useGetPurchaseOrdersPageQuery,
  useGetReceivedPurchaseOrdersPageQuery,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  useUpdatePurchaseOrderStatusMutation,
  useGetSuppliersPageQuery,
  useGetSuppliersAllQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  usePatchSupplierMutation,
  useGetUsersPageQuery,
  useRegisterUserMutation,
  useUpdateUserMutation,
  useUpdateUserRolesMutation,
  useGetPaymentMethodsQuery,
  useCreatePaymentMutation,
  useGetPaymentHistoryByPurchaseOrderIdQuery,
  useGetDashboardStatsQuery,
  useGetTransactionsByVariantIdQuery,
} = api;
