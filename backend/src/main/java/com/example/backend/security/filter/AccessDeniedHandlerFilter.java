package com.example.backend.security.filter;

import com.example.backend.exception.ErrorCode;
import com.example.backend.security.exception.FilterExceptionHandler;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@AllArgsConstructor
public class AccessDeniedHandlerFilter implements AccessDeniedHandler {
    private final FilterExceptionHandler filterExceptionHandler;

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException) throws IOException {
        filterExceptionHandler.writeError(response, ErrorCode.FORBIDDEN_ACCESS.getStatus(), ErrorCode.FORBIDDEN_ACCESS.getMessage());
    }
}
