package com.example.backend.exception;

import lombok.Getter;

@Getter
public enum ErrorCode {
    TOKEN_SUBJECT_MISMATCH(401, "Invalid token signature"),
    UNAUTHORIZED_ACCESS(401, "Unauthorized access"),
    FORBIDDEN_ACCESS(403, "Forbidden access"),
    INACTIVE(400, "Account is inactive"),
    ACCOUNT_NOT_FOUND(404, "Account not found"),
    ROLE_NOT_FOUND(404, "Role not found"),
    SUPPLIER_NOT_FOUND(404, "Supplier not found"),
    CATEGORY_NOT_FOUND(404, "Category not found"),
    CONFLICT_ACCOUNT(409, "Account already exists"),
    CONFLICT_SUPPLIER_CODE(409, "Supplier code already exists"),
    CONFLICT_CATEGORY_CODE(409, "Category code already exists"),
    UNAUTHORIZED_REFRESH_TOKEN(401, "Invalid refresh token"),
    INTERNAL_SERVER_ERROR(500, "Internal server error"),
    SKU_ALREADY_EXISTS(400, "SKU already exists in the system"),
    VARIANT_NOT_FOUND(404, "Product variant not found"),
    INVENTORY_NOT_FOUND(404, "Inventory data not found for this variant"),
    INSUFFICIENT_STOCK(400, "Insufficient stock to perform this operation");

    private final int status;
    private final String message;

    ErrorCode(int status, String message) {
        this.status = status;
        this.message = message;
    }
}
