package com.coffeehouse.backend.controller;

import com.coffeehouse.backend.dto.RegisterRequest;
import com.coffeehouse.backend.model.User;
import com.coffeehouse.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/registration")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class RegistrationController {
    @Autowired
    private UserRepository userRepository;





    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestPart("user") String userJson,
            @RequestPart(value = "govIdFile", required = false) MultipartFile file) {

        RegisterRequest request;
        try {
            request = new ObjectMapper().readValue(userJson, RegisterRequest.class);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Invalid registration data: " + e.getMessage());
        }

        // ...everything else remains the same!
        String validationError = validateRegistrationRequest(request);
        if (validationError != null) {
            return ResponseEntity.badRequest().body(validationError);
        }

        // Check if email already used
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Email already registered.");
        }

        // Generate username (e.g., john.doe or john.doe123)
        String baseUsername = request.getFirstName().toLowerCase() + "." + request.getLastName().toLowerCase();
        String username = baseUsername;
        int counter = 1;
        while (userRepository.existsByUsername(username)) {
            username = baseUsername + counter++;
        }

        // Simulate govId file upload storage (store file name; real implementation would upload to S3 or similar)
        String govIdFileName = null;
        String govIdFileUrl = null;
        if (file != null && !file.isEmpty()) {
            govIdFileName = file.getOriginalFilename();
            govIdFileUrl = "/uploads/govids/" + UUID.randomUUID() + "_" + govIdFileName; // Just a path for now
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(request.getEmail());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());
        user.setRole(request.getRole());
        user.setDateOfBirth(request.getDateOfBirth());
        user.setStatus("PENDING");
        user.setEducation(request.getEducation());
        user.setSchoolName(request.getSchoolName());
        user.setCollegeName(request.getCollegeName());
        user.setDegreeDetails(request.getDegreeDetails());
        user.setCourseStream(request.getCourseStream());
        user.setYearOfPassing(request.getYearOfPassing());
        user.setRollNumber(request.getRollNumber());
        user.setGovIdType(request.getGovIdType());
        user.setGovIdFileName(govIdFileName);
        user.setGovIdFileUrl(govIdFileUrl);
        user.setAddress(request.getAddress());
        user.setCity(request.getCity());
        user.setState(request.getState());
        user.setPostalCode(request.getPostalCode());
        user.setCountry(request.getCountry());
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        userRepository.save(user);

        return ResponseEntity.ok("Registration submitted! Await admin approval.");
    }

    private String validateRegistrationRequest(RegisterRequest request) {
        if (isBlank(request.getFirstName())
                || isBlank(request.getLastName())
                || isBlank(request.getEmail())
                || isBlank(request.getPhone())
                || isBlank(request.getRole())) {
            return "First name, last name, email, phone and role are required.";
        }

        String normalizedRole = request.getRole().trim().toUpperCase();
        Set<String> publicRoles = Set.of("CUSTOMER", "CAFE_OWNER");
        if (!publicRoles.contains(normalizedRole)) {
            return "Role is not allowed in public registration. Waiter and Chef must be added by cafe owner.";
        }
        request.setRole(normalizedRole);

        if (isBlank(request.getDateOfBirth())) {
            return "Date of birth is required.";
        }

        Set<String> rolesRequiringEducation = Set.of("CAFE_OWNER");
        if (rolesRequiringEducation.contains(request.getRole()) && isBlank(request.getEducation())) {
            return "Education qualification is required for Cafe Owner role.";
        }

        if (!isBlank(request.getEducation())) {
            if ("10TH".equals(request.getEducation()) || "12TH".equals(request.getEducation())) {
                if (isBlank(request.getSchoolName()) || isBlank(request.getYearOfPassing())) {
                    return "School name and year of passing are required for selected education.";
                }
            } else if ("UG".equals(request.getEducation()) || "PG".equals(request.getEducation())) {
                if (isBlank(request.getDegreeDetails())
                        || isBlank(request.getCollegeName())
                        || isBlank(request.getCourseStream())
                        || isBlank(request.getYearOfPassing())
                        || isBlank(request.getRollNumber())) {
                    return "Degree, college, course, year of passing and roll number are required for selected education.";
                }
            }
        }

        if (isBlank(request.getGovIdType())) {
            return "Government ID type is required.";
        }

        return null;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
