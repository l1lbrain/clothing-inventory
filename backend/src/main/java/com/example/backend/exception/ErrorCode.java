package com.example.backend.exception;

import lombok.Getter;

@Getter
public enum ErrorCode {
    TOKEN_SUBJECT_MISMATCH(401, "Invalid token signature"),
    UNAUTHORIZED_ACCESS(401, "Unauthorized access"),
    FORBIDDEN_ACCESS(403, "Forbidden access"),
    INACTIVE(400, "Account is inactive"),
    ACCOUNT_NOT_FOUND(404, "Account not found"),
    CONFLICT_ACCOUNT(409, "Account already exists"),
    UNAUTHORIZED_REFRESH_TOKEN(401, "Invalid refresh token"),
    INTERNAL_SERVER_ERROR(500, "Internal server error");

    private final int status;
    private final String message;

    ErrorCode(int status, String message) {
        this.status = status;
        this.message = message;
    }
}
