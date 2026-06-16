package com.example.backend.controller;

import com.example.backend.dto.request.AuthRequestDto;
import com.example.backend.dto.response.AuthResponseDto;
import com.example.backend.exception.ErrorCode;
import com.example.backend.exception.InvalidException;
import com.example.backend.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @GetMapping("/me")
    public ResponseEntity<AuthResponseDto.Me> me(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok().body(authService.me(jwt.getSubject()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto.info> login(@Valid @RequestBody AuthRequestDto.Login login, HttpServletResponse response) {
        return ResponseEntity.ok(authService.login(login, response));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponseDto.info> register(@Valid @RequestBody AuthRequestDto.Register register, HttpServletResponse response) {
        return ResponseEntity.ok(authService.register(register, response));
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<AuthResponseDto.RefreshToken> refreshToken(@CookieValue(value = "refreshToken", required = false) String refreshToken) {
        if (refreshToken == null) throw new InvalidException(ErrorCode.UNAUTHORIZED_REFRESH_TOKEN);
        return ResponseEntity.ok().body(authService.refreshAccessToken(refreshToken));
    }
}
