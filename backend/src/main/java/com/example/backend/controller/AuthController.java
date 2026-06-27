package com.example.backend.controller;

import com.example.backend.dto.request.AuthRequestDto;
import com.example.backend.dto.response.AuthResponseDto;
import com.example.backend.exception.ErrorCode;
import com.example.backend.exception.InvalidException;
import com.example.backend.service.AuthService;
import com.example.backend.service.CacheService;
import com.example.backend.util.JwtUtil;
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
    private final JwtUtil jwtUtil;
    private final CacheService cacheService;

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

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(value = "refresh_token", required = false) String refreshToken) {
        if (refreshToken == null) throw new InvalidException(ErrorCode.UNAUTHORIZED_REFRESH_TOKEN);
        Jwt jwt;
        try {
            jwt = jwtUtil.verifyToken(refreshToken);

            if (!"refresh_token".equals(jwt.getClaim("type").toString())) {
                throw new InvalidException(ErrorCode.UNAUTHORIZED_REFRESH_TOKEN);
            }

        } catch (Exception e) {
            throw new InvalidException(ErrorCode.UNAUTHORIZED_REFRESH_TOKEN);
        }
        if (!cacheService.deleteRefreshToken(jwt.getSubject(), refreshToken))
            throw new InvalidException(ErrorCode.INTERNAL_SERVER_ERROR);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<AuthResponseDto.RefreshToken> refreshToken(@CookieValue(value = "refresh_token", required = false) String refreshToken) {
        if (refreshToken == null) throw new InvalidException(ErrorCode.UNAUTHORIZED_REFRESH_TOKEN);
        return ResponseEntity.ok().body(authService.refreshAccessToken(refreshToken));
    }
}
