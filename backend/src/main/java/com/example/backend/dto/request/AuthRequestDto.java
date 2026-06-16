package com.example.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

public class AuthRequestDto {
    @Getter
    @Setter
    public static class Register {
        private String username;
        private String password;
        private String fullName;
        private String phone;
        private String email;
    }

    @Getter
    @Setter
    public static class Login {
        private String username;
        private String password;

    }
}
