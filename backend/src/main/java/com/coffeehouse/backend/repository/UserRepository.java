package com.coffeehouse.backend.repository;

import com.coffeehouse.backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    List<User> findByStatus(String status); // Used for pending-users
    List<User> findByCafeIdAndRole(String cafeId, String role);
    long countByCafeIdAndRole(String cafeId, String role);
    long countByStatus(String status);

    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
}
