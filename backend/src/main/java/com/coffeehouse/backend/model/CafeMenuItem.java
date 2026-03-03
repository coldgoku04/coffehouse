package com.coffeehouse.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "cafe_menu_items")
public class CafeMenuItem {
    @Id
    private String id;

    @Indexed
    private String cafeId;

    private String name;
    private String description;
    private String category;
    private Double price;
    private String imageUrl;
    private Boolean available;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public CafeMenuItem() {
        this.available = true;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
}
