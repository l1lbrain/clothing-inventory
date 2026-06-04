package com.example.backend.exception;

import com.example.backend.dto.response.FormatMessageResponseDto;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.MethodParameter;
import org.springframework.expression.AccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import java.util.Objects;

@RestControllerAdvice
public class GlobalExceptionHandler implements ResponseBodyAdvice<Object> {
    @Override
    public boolean supports(@NonNull MethodParameter returnType, @NonNull Class<? extends HttpMessageConverter<?>> converterType) {
        return true; // true để wrap toàn bộ response
    }

    @Override
    public Object beforeBodyWrite(Object body, @NonNull MethodParameter returnType, @NonNull MediaType selectedContentType,
                                  @NonNull Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  @NonNull ServerHttpRequest request, @NonNull ServerHttpResponse response) {
        HttpServletResponse httpServletResponse = ((ServletServerHttpResponse) response).getServletResponse();
        if (body instanceof FormatMessageResponseDto) return body;

        int status = httpServletResponse.getStatus();
        FormatMessageResponseDto<Object> formatMessageResponseDto = new FormatMessageResponseDto<>();
        formatMessageResponseDto.setData(body);
        formatMessageResponseDto.setStatusCode(status);
        return formatMessageResponseDto;
    }

    public <T> ResponseEntity<FormatMessageResponseDto<T>> formatException(HttpStatus status, String message) {
        FormatMessageResponseDto<T> formatResponseDTO = new FormatMessageResponseDto<>();
        formatResponseDTO.setSuccess(false);
        formatResponseDTO.setStatusCode(status.value());
        formatResponseDTO.setMessage(message);
        formatResponseDTO.setData(null);
        return ResponseEntity.status(status).body(formatResponseDTO);
    }

    @ExceptionHandler(InvalidException.class)
    public ResponseEntity<FormatMessageResponseDto<Object>> handleExceptionCustom(InvalidException e) {
        HttpStatus status = HttpStatus.valueOf(e.getErrorCode().getStatus());
        return formatException(status, e.getMessage());
    }

    @ExceptionHandler(AccessException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ResponseEntity<FormatMessageResponseDto<Void>> handleException403() {
        return formatException(HttpStatus.FORBIDDEN, "Forbidden");
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<FormatMessageResponseDto<Void>> handleException404() {
        return formatException(HttpStatus.NOT_FOUND, "Resource Not Found");
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<FormatMessageResponseDto<Void>> handleException500() {
        return formatException(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error");
    }

    @ExceptionHandler(value = {UsernameNotFoundException.class, BadCredentialsException.class})
    public ResponseEntity<FormatMessageResponseDto<Void>> handleWrongAccount() {
        return formatException(HttpStatus.UNAUTHORIZED, "Wrong username or password");
    }

    @ExceptionHandler(value = {MethodArgumentNotValidException.class})
    public ResponseEntity<FormatMessageResponseDto<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String message = Objects.requireNonNull(ex.getBindingResult()
                        .getFieldError())
                .getDefaultMessage();
        return formatException(HttpStatus.BAD_REQUEST, message);
    }
}
