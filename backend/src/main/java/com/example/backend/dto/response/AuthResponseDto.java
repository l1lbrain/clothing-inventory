package com.example.backend.dto.response;

import lombok.Getter;
import lombok.Setter;

public class AuthResponseDto {
    @Getter
    @Setter
    public static class info {
        private String uuid;
        private String fullName;
        private String phone;
        private String email;
        private String createdAt;
        private String accessToken;
    }

    @Getter
    @Setter
    public static class Me {
        private String uuid;
        private String fullName;
        private String phone;
        private String email;
        private String createdAt;
    }

    @Getter
    @Setter
    public static class RefreshToken {
        private String accessToken;
    }
}
