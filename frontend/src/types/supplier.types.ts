import type { Status } from "./common.types";

export interface Supplier {
  id: string;
  code: string;
  companyName: string;
  taxCode: string;
  representative: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  note: string;
  status: Status;
  createdAt: string;
  updatedAt?: string;
}

export interface SupplierFormData {
  companyName: string;
  taxCode: string;
  representative: string;
  address: string;
  email: string;
  phone: string;
  note: string;
  status?: Status;
}
