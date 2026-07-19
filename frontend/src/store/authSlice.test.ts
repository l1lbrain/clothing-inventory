import { describe, expect, it } from "vitest";
import authReducer, { logout, setCredentials, type AuthUser } from "./authSlice";

const user: AuthUser = {
  uuid: "user-1",
  fullName: "Nguyen Van A",
  phone: null,
  email: "user@example.com",
  createdAt: "2026-07-19T00:00:00Z",
};

describe("authSlice", () => {
  it("returns an empty auth state by default", () => {
    expect(authReducer(undefined, { type: "unknown" })).toEqual({
      user: null,
      accessToken: null,
      authorities: [],
    });
  });

  it("stores credentials", () => {
    const state = authReducer(
      undefined,
      setCredentials({
        user,
        accessToken: "access-token",
        authorities: ["admin"],
      }),
    );

    expect(state).toEqual({
      user,
      accessToken: "access-token",
      authorities: ["admin"],
    });
  });

  it("clears credentials on logout", () => {
    const authenticatedState = authReducer(
      undefined,
      setCredentials({
        user,
        accessToken: "access-token",
        authorities: ["admin"],
      }),
    );

    expect(authReducer(authenticatedState, logout())).toEqual({
      user: null,
      accessToken: null,
      authorities: [],
    });
  });
});
