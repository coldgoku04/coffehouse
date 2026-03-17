package com.coffeehouse.backend.dto;

import lombok.Data;

@Data
public class OwnerEmployeeRegisterRequest {
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String role; // WAITER or CHEF
    private String dateOfBirth;
    private String education;
    private String schoolName;
    private String collegeName;
    private String degreeDetails;
    private String courseStream;
    private String yearOfPassing;
    private String rollNumber;
    private String govIdType;
    private String address;
    private String city;
    private String state;
    private String postalCode;
    private String country;
}
