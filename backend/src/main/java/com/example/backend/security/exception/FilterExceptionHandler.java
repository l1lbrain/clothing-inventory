package com.example.backend.security.exception;

import com.example.backend.dto.response.FormatMessageResponseDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;

@Component
@AllArgsConstructor
public class FilterExceptionHandler {
    private final ObjectMapper objectMapper;

    public void writeError(HttpServletResponse response, int status, String message) throws IOException {
        FormatMessageResponseDto<Void> body = new FormatMessageResponseDto<>();
        body.setSuccess(false);
        body.setStatusCode(status);
        body.setMessage(message);
        body.setData(null);
        body.setTimestamp(Instant.now().toString());

        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
