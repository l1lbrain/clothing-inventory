package com.example.backend.exception;

import lombok.Getter;

@Getter
public enum ErrorCode {
    TOKEN_SUBJECT_MISMATCH(401, "Invalid token signature"),
    UNAUTHORIZED_ACCESS(401, "Unauthorized access"),
    FORBIDDEN_ACCESS(403, "Forbidden access");

    private final int status;
    private final String message;

    ErrorCode(int status, String message) {
        this.status = status;
        this.message = message;
    }
}
