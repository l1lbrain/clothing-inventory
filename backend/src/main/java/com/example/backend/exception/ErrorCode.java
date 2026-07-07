package com.example.backend.exception;

import lombok.Getter;

@Getter
public enum ErrorCode {
    TOKEN_SUBJECT_MISMATCH(401, "Invalid token signature"),
    UNAUTHORIZED_ACCESS(401, "Unauthorized access"),
    FORBIDDEN_ACCESS(403, "Forbidden access"),
    ACCOUNT_INACTIVE(400, "Account is inactive"),
    ACCOUNT_NOT_FOUND(404, "Account not found"),
    ROLE_NOT_FOUND(404, "Role not found"),
    SUPPLIER_NOT_FOUND(404, "Supplier not found"),
    CATEGORY_NOT_FOUND(404, "Category not found"),
    PRODUCT_NOT_FOUND(404, "Product not found"),
    VARIANT_NOT_FOUND(404, "Product variant not found"),
    PURCHASE_ORDER_NOT_FOUND(404, "Purchase order not found"),
    PAYMENT_METHOD_NOT_FOUND(404, "Payment method not found"),

    CONFLICT_ACCOUNT(409, "Account already exists"),
    CONFLICT_USER_EMAIL(409, "Email already in use by another account"),
    CONFLICT_USER_PHONE(409, "Phone number already in use by another account"),
    CONFLICT_SUPPLIER_CODE(409, "Supplier code already exists"),
    CONFLICT_SUPPLIER_EMAIL(409, "Supplier email already exists"),
    CONFLICT_SUPPLIER_PHONE(409, "Supplier phone already exists"),
    CONFLICT_SUPPLIER_TAX_CODE(409, "Supplier tax code already exists"),
    CONFLICT_CATEGORY_CODE(409, "Category code already exists"),
    CONFLICT_PRODUCT_CODE(409, "Product code already exists"),
    CONFLICT_PURCHASE_ORDER_CODE(409, "Purchase order code already exists"),
    CONFLICT_PAYMENT_METHOD_CODE(409, "Payment method code already exists"),
    SKU_ALREADY_EXISTS(400, "SKU already exists in the system"),

    UNAUTHORIZED_REFRESH_TOKEN(401, "Invalid refresh token"),
    INTERNAL_SERVER_ERROR(500, "Internal server error"),
    INSUFFICIENT_STOCK(400, "Insufficient stock to perform this operation"),
    INVALID_PURCHASE_ORDER_STATUS_TRANSITION(400, "Invalid purchase order status transition"),
    PURCHASE_ORDER_CANNOT_BE_MODIFIED(400, "Purchase order cannot be modified in its current status"),
    PAYMENT_AMOUNT_EXCEEDS_REMAINING(400, "Payment amount exceeds remaining amount"),

    CANNOT_DELETE_SUPPLIER_HAS_PURCHASE_ORDER(409, "Cannot delete supplier with existing purchase orders"),
    CANNOT_DELETE_CATEGORY_HAS_PRODUCTS(409, "Cannot delete category because it has existing products"),
    CANNOT_DELETE_PRODUCT_HAS_TRANSACTIONS(409, "Cannot delete product because its variants have existing transactions"),
    CANNOT_DELETE_VARIANT_HAS_TRANSACTIONS(409, "Cannot delete variant with existing transactions"),
    CANNOT_UPDATE_VARIANT_HAS_TRANSACTIONS(409, "Cannot update variant with existing transactions");


    private final int status;
    private final String message;

    ErrorCode(int status, String message) {
        this.status = status;
        this.message = message;
    }
}