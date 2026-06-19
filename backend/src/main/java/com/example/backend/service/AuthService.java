package com.example.backend.service;

import com.example.backend.dto.request.AuthRequestDto;
import com.example.backend.dto.response.AuthResponseDto;
import com.example.backend.exception.ErrorCode;
import com.example.backend.exception.InvalidException;
import com.example.backend.mapper.AuthMapper;
import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.detail.UserDetailService;
import com.example.backend.util.JwtUtil;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;


@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final AuthenticationManagerBuilder authenticationManagerBuilder;
    private final JwtUtil jwtUtil;
    private final CacheService cacheService;
    private final AuthMapper authMapper;
    private final PasswordEncoder passwordEncoder;
    private final UserDetailService userDetailService;

    public AuthResponseDto.Me me(String uuid) {
        User user = userRepository.findByUuid(uuid).orElseThrow(() -> new InvalidException(ErrorCode.ACCOUNT_NOT_FOUND));
        return authMapper.toMe(user);
    }

    @Transactional
    public AuthResponseDto.info login(AuthRequestDto.Login login, HttpServletResponse response) {
        UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                login.getUsername(),
                login.getPassword()
        );
        Authentication authentication = authenticationManagerBuilder.getObject().authenticate(authenticationToken);
        User user = userRepository.findByUsername(login.getUsername()).orElseThrow(() -> new InvalidException(ErrorCode.ACCOUNT_NOT_FOUND));

        if (user.getStatus().equals("INACTIVE")) throw new InvalidException(ErrorCode.INACTIVE);
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String accessToken = jwtUtil.generateAccessToken(user.getUuid(), authentication);
        String refreshToken = jwtUtil.generateRefreshToken(user.getUuid(), authentication);
        ResponseCookie cookie = ResponseCookie.from("refresh_token", refreshToken)
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(7 * 24 * 60 * 60)
                .sameSite("None")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        cacheService.saveRefreshToken(user.getUuid(), refreshToken);
        return authMapper.toInfoResponse(user, accessToken);
    }

    @Transactional
    public AuthResponseDto.info register(AuthRequestDto.Register register, HttpServletResponse response) {
        if (userRepository.existsByEmail(register.getUsername()) || userRepository.existsByUsername(register.getUsername()))
            throw new InvalidException(ErrorCode.CONFLICT_ACCOUNT);
        User user = new User();
        user.setUsername(register.getUsername());
        user.setPassword(passwordEncoder.encode(register.getPassword()));
        user.setFullName(register.getFullName());
        user.setEmail(register.getEmail());
        userRepository.save(user);
        UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                register.getUsername(),
                register.getPassword()
        );
        Authentication authentication = authenticationManagerBuilder.getObject().authenticate(authenticationToken);
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String accessToken = jwtUtil.generateAccessToken(user.getUuid(), authentication);
        String refreshToken = jwtUtil.generateRefreshToken(user.getUuid(), authentication);
        ResponseCookie cookie = ResponseCookie.from("refresh_token", refreshToken)
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(7 * 24 * 60 * 60)
                .sameSite("None")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        cacheService.saveRefreshToken(user.getUuid(), refreshToken);
        return authMapper.toInfoResponse(user, accessToken);
    }

    public AuthResponseDto.RefreshToken refreshAccessToken(String refreshToken) {
        Jwt jwt;
        try {
            jwt = jwtUtil.verifyToken(refreshToken);

            if (!"refresh_token".equals(jwt.getClaim("type").toString())) {
                throw new InvalidException(ErrorCode.UNAUTHORIZED_REFRESH_TOKEN);
            }

        } catch (Exception e) {
            throw new InvalidException(ErrorCode.UNAUTHORIZED_REFRESH_TOKEN);
        }
        String uuid = jwt.getSubject();
        User user = userRepository.findByUuid(uuid).orElseThrow(() -> new InvalidException(ErrorCode.ACCOUNT_NOT_FOUND));
        if (user.getStatus().equals("INACTIVE")) throw new InvalidException(ErrorCode.INACTIVE);
        UserDetails userDetails = userDetailService.loadUserByUsername(user.getUsername());
        Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        AuthResponseDto.RefreshToken accessToken = new AuthResponseDto.RefreshToken();
        accessToken.setAccessToken(jwtUtil.generateAccessToken(uuid, authentication));
        return accessToken;
    }


}