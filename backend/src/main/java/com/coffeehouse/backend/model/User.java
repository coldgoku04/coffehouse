package com.coffeehouse.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;

@Data
@Document(collection = "users")
public class User {

    @Id
    private String id;

    // Login credentials
    @Indexed(unique = true)
    private String username; // Generated: firstname.lastname or email-based

    @Indexed(unique = true)
    private String email;

    private String password; // Hashed password

    // Personal Information (Step 1)
    private String firstName;
    private String lastName;
    private String phone;
    private String role; // CUSTOMER, CAFE_OWNER, CHEF, WAITER, ADMIN
    private String cafeId; // Assigned cafe for owner/staff
    private String createdByOwnerId; // Owner who created this staff account
    private String dateOfBirth;

    // Education Details (Step 2 - Optional)
    private String education; // 10TH, 12TH, UG, PG
    private String schoolName;
    private String collegeName;
    private String degreeDetails;
    private String courseStream;
    private String yearOfPassing;
    private String rollNumber;

    // Government ID (Step 2 - Required)
    private String govIdType; // Aadhar, PAN, etc.
    private String govIdFileName;
    private String govIdFileUrl; // Store file path or cloud URL

    // Address Information (Step 3)
    private String address;
    private String city;
    private String state;
    private String postalCode;
    private String country;

    // Registration Status
    private String status; // PENDING, APPROVED, REJECTED

    // Password Management
    private Boolean isTemporaryPassword; // true if using temp password
    private Boolean mustChangePassword; // Force password change on first login

    // Approval Tracking
    private String approvedBy; // Admin ID who approved
    private LocalDateTime approvedAt;
    private String rejectionReason; // If rejected

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime passwordChangedAt;

    // Constructor
    public User() {
        this.status = "PENDING"; // Default
        this.isTemporaryPassword = false;
        this.mustChangePassword = false;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
}
