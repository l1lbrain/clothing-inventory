package com.example.backend.exception;

import lombok.Getter;

@Getter
public class InvalidException extends RuntimeException {
    private final ErrorCode errorCode;

    public InvalidException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
