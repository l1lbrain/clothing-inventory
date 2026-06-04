package com.example.backend.config;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.OctetSequenceKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.SecretKey;

@Configuration
@Slf4j
public class JwtConfig {
    private static final MacAlgorithm macAlgorithm = MacAlgorithm.HS256;


    @Value("${jwt.secret-key}")
    private String jwtSecretKey;

    public SecretKey getSecretKey() {
        byte[] keyBytes = java.util.Base64.getDecoder().decode(jwtSecretKey);
        return new javax.crypto.spec.SecretKeySpec(keyBytes, macAlgorithm.getName());
    }

    @Bean
    public JwtEncoder jwtEncoder() {
        OctetSequenceKey octetSequenceKey = new OctetSequenceKey.Builder(getSecretKey()).build();
        JWKSource<SecurityContext> jwkSource = new ImmutableJWKSet<>(new JWKSet(octetSequenceKey));
        return new NimbusJwtEncoder(jwkSource);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withSecretKey(
                getSecretKey()).macAlgorithm(macAlgorithm).build();
        return token -> {
            try {
                return jwtDecoder.decode(token);
            } catch (Exception e) {
                log.info("JWT Decode Error: {}", e.getMessage());
                throw e;
            }
        };
    }
}
