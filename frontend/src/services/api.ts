export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// Kiểm tra route không cần auth
function isPublicPath(path: string): boolean {
  const normalized = path.toLowerCase();
  return (
    normalized.includes("/auth/login") ||
    normalized.includes("/auth/send-otp")
  );
}

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function clearSessionAndRedirect() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("currentUser");
  window.location.href = "/login";
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { skipAuth, ...init } = options;
  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = new Headers(init.headers || {});

  // Mặc định Content-Type JSON nếu có body
  if (
    !headers.has("Content-Type") &&
    init.body &&
    !(init.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  // Gắn accessToken nếu cần
  if (!skipAuth && !isPublicPath(path)) {
    const token = localStorage.getItem("accessToken");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "include", // Đính kèm cookie (refresh token)
  });

  if (!response.ok) {
    // Tự động làm mới token nếu lỗi 401
    if (
      response.status === 401 &&
      !skipAuth &&
      !isPublicPath(path) &&
      !path.includes("/auth/refresh-token") &&
      !path.includes("/auth/logout")
    ) {
      if (isRefreshing) {
        return new Promise<T>((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            const retryHeaders = new Headers(init.headers || {});
            if (
              !retryHeaders.has("Content-Type") &&
              init.body &&
              !(init.body instanceof FormData)
            ) {
              retryHeaders.set("Content-Type", "application/json");
            }
            retryHeaders.set("Authorization", `Bearer ${newToken}`);
            apiFetch<T>(path, { ...options, headers: retryHeaders })
              .then(resolve)
              .catch(reject);
          });
        });
      }

      isRefreshing = true;
      return new Promise<T>((resolve, reject) => {
        fetch(`${API_BASE_URL}/auth/refresh-token`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then(async (res) => {
            isRefreshing = false;
            if (res.ok) {
              const body = await res.json();
              const newToken = body?.data?.accessToken;
              if (newToken) {
                localStorage.setItem("accessToken", newToken);
                onRefreshed(newToken);

                const retryHeaders = new Headers(init.headers || {});
                if (
                  !retryHeaders.has("Content-Type") &&
                  init.body &&
                  !(init.body instanceof FormData)
                ) {
                  retryHeaders.set("Content-Type", "application/json");
                }
                retryHeaders.set("Authorization", `Bearer ${newToken}`);

                apiFetch<T>(path, { ...options, headers: retryHeaders })
                  .then(resolve)
                  .catch(reject);
              } else {
                clearSessionAndRedirect();
                reject(new ApiError("Session expired", 401));
              }
            } else {
              clearSessionAndRedirect();
              reject(new ApiError("Session expired", 401));
            }
          })
          .catch((err) => {
            isRefreshing = false;
            clearSessionAndRedirect();
            reject(err);
          });
      });
    }

    let errorData: unknown = null;
    let errorMessage = `HTTP error! Status: ${response.status}`;

    try {
      const text = await response.text();
      if (text) {
        errorData = JSON.parse(text);
        if (errorData && typeof errorData === "object") {
          const errObj = errorData as Record<string, unknown>;
          if (typeof errObj.message === "string") {
            errorMessage = errObj.message;
          } else if (typeof errObj.error === "string") {
            errorMessage = errObj.error;
          }
        }
      }
    } catch {
      // Phản hồi rỗng hoặc không phải JSON
    }

    throw new ApiError(errorMessage, response.status, errorData);
  }

  // Trả về JSON nếu có
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      return (await response.json()) as T;
    } catch {
      return {} as T;
    }
  }

  return {} as T;
}
