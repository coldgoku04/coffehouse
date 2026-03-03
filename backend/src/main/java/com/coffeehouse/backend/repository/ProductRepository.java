package com.coffeehouse.backend.repository;

import com.coffeehouse.backend.model.Product;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends MongoRepository<Product, String> {

    // Custom query methods
    List<Product> findByCategory(String category);

    List<Product> findByAvailable(Boolean available);

    List<Product> findByNameContainingIgnoreCase(String name);
}