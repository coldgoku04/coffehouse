    package com.coffeehouse.backend.controller;

    import com.coffeehouse.backend.dto.ApprovalRequest;
    import com.coffeehouse.backend.dto.PendingUserResponse;
    import com.coffeehouse.backend.model.User;
    import com.coffeehouse.backend.repository.UserRepository;
    import com.coffeehouse.backend.service.EmailService;
    import org.springframework.beans.factory.annotation.Autowired;
    import org.springframework.http.ResponseEntity;
    import org.springframework.security.crypto.password.PasswordEncoder;
    import org.springframework.web.bind.annotation.*;

    import java.time.LocalDateTime;
    import java.util.List;
    import java.util.Optional;
    import java.util.Random;

    @RestController
    @RequestMapping("/api/admin")
    @CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
    public class AdminApprovalController {
        @Autowired
        private UserRepository userRepository;
        @Autowired
        private EmailService emailService;
        @Autowired
        private PasswordEncoder passwordEncoder;

        // List pending users
        @GetMapping("/pending-users")
        public ResponseEntity<List<PendingUserResponse>> getPendingUsers() {
            List<PendingUserResponse> pendingUsers = userRepository.findByStatus("PENDING").stream()
                    .map(this::toPendingUserResponse)
                    .toList();
            return ResponseEntity.ok(pendingUsers);
        }

        // Admin approves or rejects
        @PostMapping("/approve")
        public ResponseEntity<?> approveUser(@RequestBody ApprovalRequest request) {
            Optional<User> userOpt = userRepository.findById(request.getUserId());
            if (userOpt.isEmpty()) return ResponseEntity.badRequest().body("User not found.");

            User user = userOpt.get();

        if ("APPROVE".equalsIgnoreCase(request.getAction())) {
            String tempPassword = generateTempPassword(8);
            String assignedRole = request.getAssignedRole() != null ? request.getAssignedRole() : user.getRole();
            boolean forcePasswordChange = !"ADMIN".equalsIgnoreCase(assignedRole);

            user.setStatus("APPROVED");
            user.setPassword(passwordEncoder.encode(tempPassword));
            user.setIsTemporaryPassword(forcePasswordChange);
            user.setMustChangePassword(forcePasswordChange);
            user.setRole(assignedRole);
            user.setApprovedAt(LocalDateTime.now());
            user.setApprovedBy("admin"); // Replace with actual admin ID

                userRepository.save(user);

                emailService.sendCredentialsEmail(user.getEmail(), user.getFirstName(), user.getUsername(), tempPassword);
                return ResponseEntity.ok("User approved and credentials sent.");
            } else {
                user.setStatus("REJECTED");
                user.setRejectionReason(request.getRejectionReason());
                userRepository.save(user);

                emailService.sendRejectionEmail(user.getEmail(), user.getFirstName(), request.getRejectionReason());
                return ResponseEntity.ok("User rejected and notified.");
            }
        }

        // Simple temp password generator
        private String generateTempPassword(int len) {
            String chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            Random r = new Random();
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < len; i++) sb.append(chars.charAt(r.nextInt(chars.length())));
            return sb.toString();
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
