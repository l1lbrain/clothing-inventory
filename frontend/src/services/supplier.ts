import { apiFetch } from "./api";
import type { Supplier, SupplierFormData } from "../types/supplier.types";

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface BackendSupplierResponse {
  id: number;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxCode: string;
  note: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedSuppliersResponse {
  items: BackendSupplierResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PaginatedSuppliers {
  items: Supplier[];
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

export function mapBackendSupplierToFrontend(
  s: BackendSupplierResponse,
): Supplier {
  return {
    id: String(s.id),
    code: s.code,
    companyName: s.name,
    taxCode: s.taxCode,
    representative: s.contactPerson || "",
    contactPerson: s.contactPerson || "",
    phone: s.phone,
    email: s.email,
    address: s.address,
    note: s.note || "",
    status: s.status?.toLowerCase() === "active" ? "active" : "inactive",
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export async function getSuppliersPage(
  page: number,
  keyword?: string,
): Promise<PaginatedSuppliers> {
  const url = keyword
    ? `/suppliers?page=${page}&keyword=${encodeURIComponent(keyword)}`
    : `/suppliers?page=${page}`;
  const response = await apiFetch<ApiResponse<PaginatedSuppliersResponse>>(url);
  const data = response.data;
  return {
    items: data.items.map(mapBackendSupplierToFrontend),
    page: data.page, // already 1-based, directly map from backend response
    pageSize: data.size,
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}

export async function createSupplier(
  form: SupplierFormData,
): Promise<Supplier> {
  const body = {
    name: form.companyName,
    contactPerson: form.representative,
    phone: form.phone,
    email: form.email,
    address: form.address,
    taxCode: form.taxCode,
    note: form.note,
  };

  const response = await apiFetch<ApiResponse<BackendSupplierResponse>>(
    "/suppliers",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  return mapBackendSupplierToFrontend(response.data);
}

export async function deleteSupplier(code: string): Promise<void> {
  await apiFetch<void>(`/suppliers/${code}`, {
    method: "DELETE",
  });
}

export async function updateSupplier(
  code: string,
  form: SupplierFormData,
): Promise<Supplier> {
  const body = {
    code,
    name: form.companyName,
    contactPerson: form.representative,
    phone: form.phone,
    email: form.email,
    address: form.address,
    taxCode: form.taxCode,
    note: form.note,
  };

  const response = await apiFetch<ApiResponse<BackendSupplierResponse>>(
    `/suppliers/${code}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );

  return mapBackendSupplierToFrontend(response.data);
}

export async function patchSupplier(
  code: string,
  partialFields: Partial<SupplierFormData>,
): Promise<Supplier> {
  const body: Record<string, string> = {};
  if (partialFields.companyName !== undefined)
    body.name = partialFields.companyName;
  if (partialFields.representative !== undefined)
    body.contactPerson = partialFields.representative;
  if (partialFields.phone !== undefined) body.phone = partialFields.phone;
  if (partialFields.email !== undefined) body.email = partialFields.email;
  if (partialFields.address !== undefined) body.address = partialFields.address;
  if (partialFields.taxCode !== undefined) body.taxCode = partialFields.taxCode;
  if (partialFields.note !== undefined) body.note = partialFields.note;

  const response = await apiFetch<ApiResponse<BackendSupplierResponse>>(
    `/suppliers/${code}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );

  return mapBackendSupplierToFrontend(response.data);
}
