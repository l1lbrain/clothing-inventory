import { apiFetch } from "./api";

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

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
