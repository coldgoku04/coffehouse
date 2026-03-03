package com.coffeehouse.backend.repository;

import com.coffeehouse.backend.model.PasswordResetOtp;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface PasswordResetOtpRepository extends MongoRepository<PasswordResetOtp, String> {
    Optional<PasswordResetOtp> findByEmail(String email);
    void deleteByEmail(String email);
}
