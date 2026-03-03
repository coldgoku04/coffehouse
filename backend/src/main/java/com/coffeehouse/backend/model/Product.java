package com.coffeehouse.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "products")
public class Product {

    @Id
    private String id;

    private String name;
    private String description;
    private Double price;
    private String category; // "coffee", "tea", "pastry", etc.
    private String imageUrl;
    private Boolean available;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Constructor
    public Product() {
        this.available = true;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
}