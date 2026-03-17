package com.coffeehouse.backend.dto;

import lombok.Data;

@Data
public class PendingUserResponse {
    private String id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
    private String status;
    private String govIdType;
    private String govIdFileName;
    private String govIdFileUrl;
}
