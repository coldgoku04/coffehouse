package com.coffeehouse.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "password_reset_otps")
public class PasswordResetOtp {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String otp;

    private LocalDateTime expiresAt;

    private LocalDateTime createdAt;
}
