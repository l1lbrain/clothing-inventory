import { apiFetch } from "./api";
import type { Supplier, SupplierFormData } from "../types/supplier.types";
import type { ApiResponse } from "../types/common.types";

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
  status?: string,
  sortBy?: string,
  sortDir?: "asc" | "desc",
): Promise<PaginatedSuppliers> {
  const params = new URLSearchParams({ page: String(page) });
  if (keyword) params.set("keyword", keyword);
  if (status) params.set("status", status.toUpperCase());
  if (sortBy) params.set("sortBy", sortBy);
  if (sortDir) params.set("sortDirection", sortDir);
  const url = `/suppliers?${params.toString()}`;

  const response = await apiFetch<ApiResponse<PaginatedSuppliersResponse>>(url);
  const data = response.data;
  return {
    items: data.items.map(mapBackendSupplierToFrontend),
    page: data.page,
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
    status: form.status?.toUpperCase() || "ACTIVE",
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
    status: form.status?.toUpperCase() || "ACTIVE",
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
  if (partialFields.status !== undefined) body.status = partialFields.status.toUpperCase();

  const response = await apiFetch<ApiResponse<BackendSupplierResponse>>(
    `/suppliers/${code}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );

  return mapBackendSupplierToFrontend(response.data);
}
