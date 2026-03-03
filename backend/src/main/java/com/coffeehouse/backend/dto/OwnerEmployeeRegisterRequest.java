package com.coffeehouse.backend.dto;

import lombok.Data;

@Data
public class OwnerEmployeeRegisterRequest {
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String role; // WAITER or CHEF
}
