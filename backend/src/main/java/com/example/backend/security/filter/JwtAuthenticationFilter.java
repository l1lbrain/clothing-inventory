package com.example.backend.security.filter;

import com.example.backend.exception.ErrorCode;
import com.example.backend.security.exception.FilterExceptionHandler;
import com.example.backend.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.MessageDigest;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final FilterExceptionHandler filterExceptionHandler;

    @Value("${api-key-sepay}")
    private String apiKeySepay;

    @Override
    protected void doFilterInternal(HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain filterChain) throws ServletException, IOException {
        if (request.getRequestURI().startsWith("/api/v1/transactions/webhook")) {

            String authHeader = request.getHeader("Authorization");

            if (authHeader == null || !authHeader.startsWith("Apikey ")) {
                filterChain.doFilter(request, response);
                return;
            }

            String apiKey = authHeader.substring(7);

            if (!MessageDigest.isEqual(apiKeySepay.getBytes(), apiKey.getBytes())) {
                filterExceptionHandler.writeError(response, ErrorCode.UNAUTHORIZED_ACCESS.getStatus(), ErrorCode.UNAUTHORIZED_ACCESS.getMessage());
                return;
            }

            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String token = authHeader.substring(7);
            String uuid = jwtUtil.extractSubject(token);

            if (uuid != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                UserDetails userDetails = userDetailsService.loadUserByUsername(uuid);

                if (jwtUtil.isTokenValid(token, userDetails)) {

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }

            filterChain.doFilter(request, response);

        } catch (Exception e) {
            SecurityContextHolder.clearContext();
            filterExceptionHandler.writeError(response, ErrorCode.UNAUTHORIZED_ACCESS.getStatus(), ErrorCode.UNAUTHORIZED_ACCESS.getMessage());
        }
    }
}
