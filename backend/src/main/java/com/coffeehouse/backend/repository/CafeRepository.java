package com.coffeehouse.backend.repository;

import com.coffeehouse.backend.model.Cafe;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CafeRepository extends MongoRepository<Cafe, String> {
    List<Cafe> findByActiveTrue();
    List<Cafe> findByOwnerId(String ownerId);
}
