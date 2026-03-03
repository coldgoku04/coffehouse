package com.coffeehouse.backend.dto;

import lombok.Data;

@Data
public class ChangePasswordRequest {
    private String userId;
    private String oldPassword;   // Temporary (current) password
    private String newPassword;
}