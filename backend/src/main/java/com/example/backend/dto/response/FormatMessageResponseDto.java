package com.example.backend.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class FormatMessageResponseDto<T> {
    private boolean success = true;
    private int statusCode;
    private String message = "request successfully";
    private T data;
    private String timestamp = LocalDateTime.now().toString();
}