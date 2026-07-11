import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./index";

export interface AuthUser {
  uuid: string;
  fullName: string;
  phone: string | null;
  email: string;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  authorities: string[];
}

// Khởi tạo state từ localStorage (đọc một lần khi load app)
function getInitialState(): AuthState {
  const token = localStorage.getItem("accessToken") ?? null;
  const userStr = localStorage.getItem("currentUser");
  let user: AuthUser | null = null;
  let authorities: string[] = [];

  if (userStr) {
    try {
      user = JSON.parse(userStr) as AuthUser;
    } catch {
      user = null;
    }
  }

  if (token) {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );
      const payload = JSON.parse(jsonPayload);
      authorities = payload.authorities || [];
    } catch {
      authorities = [];
    }
  }

  return { user, accessToken: token, authorities };
}

const authSlice = createSlice({
  name: "auth",
  initialState: getInitialState(),
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ user: AuthUser; accessToken: string; authorities: string[] }>,
    ) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.authorities = action.payload.authorities;
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.authorities = [];
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectAuthorities = (state: RootState) => state.auth.authorities;
export const selectIsAuthenticated = (state: RootState) => !!state.auth.accessToken;
export const selectIsAdmin = (state: RootState) => state.auth.authorities.includes("admin");
