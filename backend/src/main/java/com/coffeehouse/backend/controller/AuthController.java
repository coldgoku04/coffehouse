package com.coffeehouse.backend.controller;

import com.coffeehouse.backend.dto.*;
import com.coffeehouse.backend.model.PasswordResetOtp;
import com.coffeehouse.backend.model.User;
import com.coffeehouse.backend.repository.PasswordResetOtpRepository;
import com.coffeehouse.backend.repository.UserRepository;
import com.coffeehouse.backend.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class AuthController {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordResetOtpRepository passwordResetOtpRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // LOGIN
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());
        if (userOpt.isEmpty())
            return ResponseEntity.badRequest().body(new AuthResponse("User not found.", false, null));
        User user = userOpt.get();

        if (!passwordMatches(request.getPassword(), user.getPassword()))
            return ResponseEntity.badRequest().body(new AuthResponse("Invalid password.", false, null));
        if (!"APPROVED".equals(user.getStatus()))
            return ResponseEntity.badRequest().body(new AuthResponse("Account not approved yet.", false, null));

        boolean shouldSaveUser = false;
        if (!isBcryptHash(user.getPassword())) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            shouldSaveUser = true;
        }

        // Admin accounts should not be forced into first-login password change flow.
        if ("ADMIN".equalsIgnoreCase(user.getRole())
                && Boolean.TRUE.equals(user.getMustChangePassword())) {
            user.setMustChangePassword(false);
            user.setIsTemporaryPassword(false);
            shouldSaveUser = true;
        }

        if (shouldSaveUser) {
            userRepository.save(user);
        }

        return ResponseEntity.ok(new AuthResponse("Login successful.", true, user));
    }

    // LIST PENDING USERS
    @GetMapping("/pending-users")
    public List<PendingUserResponse> getPendingUsers() {
        return userRepository.findByStatus("PENDING").stream()
                .map(this::toPendingUserResponse)
                .toList();
    }

    @GetMapping("/approved-users/count")
    public ResponseEntity<?> getApprovedUsersCount() {
        long count = userRepository.countByStatus("APPROVED");
        return ResponseEntity.ok(Map.of("count", count));
    }

    // APPROVE OR REJECT USER
    @PostMapping("/process-approval")
    public ResponseEntity<?> processApproval(@RequestBody ApprovalRequest approval) {
        if (approval.getUserId() == null || approval.getUserId().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "userId is required."));
        }
        if (approval.getAction() == null || approval.getAction().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "action is required."));
        }

        Optional<User> userOpt = userRepository.findById(approval.getUserId());
        if (userOpt.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("message", "User not found."));
        User user = userOpt.get();

        if ("APPROVE".equalsIgnoreCase(approval.getAction())) {
            // Best practice: Generate secure temp password
            String tempPassword = UUID.randomUUID().toString().substring(0, 10); // 10-char random string
            String assignedRole = (approval.getAssignedRole() != null)
                    ? approval.getAssignedRole()
                    : user.getRole();
            boolean forcePasswordChange = !"ADMIN".equalsIgnoreCase(assignedRole);

            user.setPassword(passwordEncoder.encode(tempPassword));
            user.setMustChangePassword(forcePasswordChange);
            user.setIsTemporaryPassword(forcePasswordChange);
            user.setStatus("APPROVED");
            user.setRole(assignedRole);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);

            // Send credentials by email
            emailService.sendCredentialsEmail(
                    user.getEmail(),
                    user.getFirstName(),
                    user.getUsername(),
                    tempPassword
            );
            return ResponseEntity.ok(Map.of("message", "User approved, credentials emailed."));
        } else if ("REJECT".equalsIgnoreCase(approval.getAction())) {
            user.setStatus("REJECTED");
            user.setRejectionReason(approval.getRejectionReason());
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);

            emailService.sendRejectionEmail(
                    user.getEmail(),
                    user.getFirstName(),
                    approval.getRejectionReason()
            );

            return ResponseEntity.ok(Map.of("message", "User rejected, notification sent."));
        } else {
            return ResponseEntity.badRequest().body(Map.of("message", "Unknown action."));
        }
    }

    // CHANGE PASSWORD
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request) {
        Optional<User> userOpt = userRepository.findById(request.getUserId());
        if (userOpt.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("message", "User not found."));
        User user = userOpt.get();
        if (!passwordMatches(request.getOldPassword(), user.getPassword()))
            return ResponseEntity.badRequest().body(Map.of("message", "Old password incorrect."));
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setIsTemporaryPassword(false);
        user.setMustChangePassword(false);
        user.setPasswordChangedAt(java.time.LocalDateTime.now());
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully."));
    }

    @PostMapping("/forgot-password/request-otp")
    public ResponseEntity<?> requestPasswordResetOtp(@RequestBody ForgotPasswordOtpRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required."));
        }

        Optional<User> userOpt = userRepository.findByEmail(request.getEmail().trim());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "No user found with this email."));
        }

        User user = userOpt.get();
        String otp = String.format("%06d", new Random().nextInt(1_000_000));
        LocalDateTime now = LocalDateTime.now();

        PasswordResetOtp resetOtp = passwordResetOtpRepository.findByEmail(user.getEmail())
                .orElseGet(PasswordResetOtp::new);
        resetOtp.setEmail(user.getEmail());
        resetOtp.setOtp(otp);
        resetOtp.setCreatedAt(now);
        resetOtp.setExpiresAt(now.plusMinutes(10));
        passwordResetOtpRepository.save(resetOtp);

        String name = user.getFirstName() != null && !user.getFirstName().isBlank() ? user.getFirstName() : user.getUsername();
        emailService.sendPasswordResetOtpEmail(user.getEmail(), name, otp);
        return ResponseEntity.ok(Map.of("message", "OTP sent to your email."));
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<?> resetPasswordWithOtp(@RequestBody ResetPasswordWithOtpRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()
                || request.getOtp() == null || request.getOtp().isBlank()
                || request.getNewPassword() == null || request.getNewPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email, OTP and new password are required."));
        }

        Optional<User> userOpt = userRepository.findByEmail(request.getEmail().trim());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "No user found with this email."));
        }

        Optional<PasswordResetOtp> otpOpt = passwordResetOtpRepository.findByEmail(request.getEmail().trim());
        if (otpOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "OTP not found. Please request a new OTP."));
        }

        PasswordResetOtp resetOtp = otpOpt.get();
        if (resetOtp.getExpiresAt() == null || resetOtp.getExpiresAt().isBefore(LocalDateTime.now())) {
            passwordResetOtpRepository.deleteByEmail(resetOtp.getEmail());
            return ResponseEntity.badRequest().body(Map.of("message", "OTP expired. Please request a new OTP."));
        }

        if (!request.getOtp().trim().equals(resetOtp.getOtp())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid OTP."));
        }

        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setIsTemporaryPassword(false);
        user.setMustChangePassword(false);
        user.setPasswordChangedAt(LocalDateTime.now());
        userRepository.save(user);
        passwordResetOtpRepository.deleteByEmail(user.getEmail());

        return ResponseEntity.ok(Map.of("message", "Password reset successful. Please sign in."));
    }

    private boolean passwordMatches(String rawPassword, String storedPassword) {
        if (rawPassword == null || storedPassword == null) {
            return false;
        }
        if (isBcryptHash(storedPassword)) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }
        return rawPassword.equals(storedPassword);
    }

    private boolean isBcryptHash(String password) {
        return password != null && password.matches("^\\$2[aby]\\$\\d{2}\\$.*");
    }

    private PendingUserResponse toPendingUserResponse(User user) {
        PendingUserResponse response = new PendingUserResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setRole(user.getRole());
        response.setStatus(user.getStatus());
        return response;
    }
}
