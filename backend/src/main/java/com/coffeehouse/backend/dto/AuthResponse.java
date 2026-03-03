package com.coffeehouse.backend.dto;

import com.coffeehouse.backend.model.User;
import lombok.Data;

@Data
public class AuthResponse {
    private String message;
    private boolean success;
    private User user;

    public AuthResponse(String message, boolean success, User user) {
        this.message = message;
        this.success = success;
        this.user = user;
    }
}