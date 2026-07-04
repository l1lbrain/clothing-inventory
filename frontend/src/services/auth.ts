import { apiFetch } from "./api";
import type { ApiResponse } from "../types/common.types";

export interface User {
  uuid: string;
  fullName: string;
  phone: string | null;
  email: string;
  createdAt: string;
}

export interface LoginResponse {
  uuid: string;
  fullName: string;
  phone: string | null;
  email: string;
  createdAt: string;
  accessToken: string;
}

// Đăng nhập người dùng
export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const response = await apiFetch<ApiResponse<LoginResponse>>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  const loginData = response.data;
  if (loginData && loginData.accessToken) {
    localStorage.setItem("accessToken", loginData.accessToken);
    const user: User = {
      uuid: loginData.uuid,
      fullName: loginData.fullName,
      phone: loginData.phone,
      email: loginData.email,
      createdAt: loginData.createdAt,
    };
    localStorage.setItem("currentUser", JSON.stringify(user));
  }

  return loginData;
}

// Đăng xuất và xóa session
export async function logout(): Promise<void> {
  try {
    await apiFetch<ApiResponse<void>>("/auth/logout", {
      method: "POST",
    });
  } catch (error) {
    console.error("Lỗi gọi API logout:", error);
  } finally {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("currentUser");
    // Chuyển hướng về trang đăng nhập
    window.location.href = "/login";
  }
}

// Lấy thông tin user hiện tại
export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem("currentUser");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
}

// Kiểm tra đăng nhập
export function isAuthenticated(): boolean {
  return !!localStorage.getItem("accessToken");
}

// Lấy thông tin user mới nhất từ server
export async function fetchCurrentUser(): Promise<User> {
  const response = await apiFetch<ApiResponse<User>>("/auth/me");
  const user = response.data;
  if (user) {
    localStorage.setItem("currentUser", JSON.stringify(user));
  }
  return user;
}

// Giải mã JWT để lấy quyền (authorities)
export function getUserAuthorities(): string[] {
  const token = localStorage.getItem("accessToken");
  if (!token) return [];
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return [];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    return payload.authorities || [];
  } catch (error) {
    console.error("Lỗi khi giải mã token:", error);
    return [];
  }
}

export interface RegisterRequest {
  username: string;
  password: string;
  fullName: string;
  phone: string;
  email: string;
  roles: string[];
}

// Tạo tài khoản người dùng mới (chỉ admin)
export async function registerUser(payload: RegisterRequest): Promise<void> {
  await apiFetch<ApiResponse<unknown>>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface UserResponse {
  uuid: string;
  username: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  createdAt: string;
  roles: string[];
}

export interface PaginatedUsers {
  items: UserResponse[];
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

export interface UserUpdateRequest {
  fullName?: string;
  phone?: string;
  email?: string;
  status?: "ACTIVE" | "INACTIVE" | "DELETED";
}

// Lấy danh sách tài khoản phân trang (chỉ admin)
export async function getUsersPage(
  page: number,
  keyword?: string,
  status?: "ACTIVE" | "INACTIVE",
  sortBy?: string,
  sortDir?: "asc" | "desc",
): Promise<PaginatedUsers> {
  const params = new URLSearchParams({ page: String(page) });
  if (keyword) params.set("keyword", keyword.trim());
  if (status) params.set("status", status);
  if (sortBy) params.set("sortBy", sortBy);
  if (sortDir) params.set("sortDirection", sortDir);
  const url = `/users?${params.toString()}`;

  const response = await apiFetch<ApiResponse<{
    items: UserResponse[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  }>>(url);

  return {
    items: response.data.items || [],
    page: response.data.page,
    pageSize: response.data.size,
    totalElements: response.data.totalElements,
    totalPages: response.data.totalPages,
  };
}

// Cập nhật thông tin tài khoản (chỉ admin)
export async function updateUser(
  uuid: string,
  payload: UserUpdateRequest,
): Promise<UserResponse> {
  const response = await apiFetch<ApiResponse<UserResponse>>(`/users/${uuid}`, {
    method: "PATCH",
    body: JSON.stringify({
      fullName: payload.fullName,
      phone: payload.phone,
      email: payload.email,
      status: payload.status,
    }),
  });
  return response.data;
}

// Cập nhật quyền/vai trò tài khoản (chỉ admin)
export async function updateUserRoles(
  uuid: string,
  roles: string[],
): Promise<UserResponse> {
  const response = await apiFetch<ApiResponse<UserResponse>>(`/users/${uuid}/roles`, {
    method: "PUT",
    body: JSON.stringify({ roles }),
  });
  return response.data;
}
