package com.coffeehouse.backend.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    // Step 1 - Personal Information
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String role;
    private String dateOfBirth;

    // Step 2 - Education (Optional)
    private String education;
    private String schoolName;
    private String collegeName;
    private String degreeDetails;
    private String courseStream;
    private String yearOfPassing;
    private String rollNumber;

    // Step 2 - Government ID (Required)
    private String govIdType;
    private String govIdFileName;


    // Step 3 - Address
    private String address;
    private String city;
    private String state;
    private String postalCode;
    private String country;

    // Step 4 - Terms
    private Boolean termsAccepted;


}
