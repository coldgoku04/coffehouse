package com.coffeehouse.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "cafe_tables")
public class CafeTable {
    @Id
    private String id;

    @Indexed
    private String cafeId;

    private String tableNumber;
    private String category;
    private Integer capacity;
    private Boolean available;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public CafeTable() {
        this.available = true;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
}
