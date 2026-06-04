package com.example.backend.util;

import com.auth0.jwt.JWT;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.example.backend.exception.ErrorCode;
import com.example.backend.exception.InvalidException;
import com.example.backend.model.User;
import com.example.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Component
@RequiredArgsConstructor
public class JwtUtil {
    public static final MacAlgorithm macAlgorithm = MacAlgorithm.HS256;
    private final JwtEncoder jwtEncoder;
    private final UserService userService;
    @Value("${jwt.access-token-validity-in-seconds}")
    private int accessTokenLifeTime;
    @Value("${jwt.refresh-token-validity-in-seconds}")
    private int refreshTokenLifeTime;

    public String generateAccessToken(String uuid, Authentication authentication) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(accessTokenLifeTime);

        List<String> authorities = authentication.getAuthorities()
                .stream()
                .map(GrantedAuthority::getAuthority).filter(Objects::nonNull)
                .toList();

        JwtClaimsSet jwtClaimsSet = JwtClaimsSet.builder()
                .issuedAt(now)
                .expiresAt(expiresAt)
                .subject(uuid)
                .claim("authorities", authorities)
                .claim("type", "access_token")
                .build();
        JwsHeader jwsHeader = JwsHeader.with(macAlgorithm).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(jwsHeader, jwtClaimsSet)).getTokenValue();
    }

    public String generateRefreshToken(String uuid, Authentication authentication) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(refreshTokenLifeTime);

        List<String> authorities = authentication.getAuthorities()
                .stream()
                .map(GrantedAuthority::getAuthority).filter(Objects::nonNull)
                .toList();

        JwtClaimsSet jwtClaimsSet = JwtClaimsSet.builder()
                .issuedAt(now)
                .expiresAt(expiresAt)
                .subject(uuid)
                .claim("authorities", authorities)
                .claim("type", "refresh_token")
                .build();
        JwsHeader jwsHeader = JwsHeader.with(macAlgorithm).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(jwsHeader, jwtClaimsSet)).getTokenValue();
    }

    public String extractSubject(String token) {
        DecodedJWT decodedJWT = JWT.decode(token);
        return decodedJWT.getSubject();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        User accounts = userService.findByUuid(extractSubject(token));
        if (!accounts.getUsername().equals(userDetails.getUsername())) {
            throw new InvalidException(ErrorCode.TOKEN_SUBJECT_MISMATCH);
        }
        return true;
    }
}
