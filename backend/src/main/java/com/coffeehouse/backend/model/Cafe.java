package com.coffeehouse.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "cafes")
public class Cafe {
    @Id
    private String id;

    @Indexed(unique = true)
    private String name;

    @Indexed
    private String ownerId;

    private String description;
    private String phone;
    private String address;
    private String city;
    private String state;
    private String logoUrl;
    private String coverImageUrl;
    private String openHours;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Cafe() {
        this.active = true;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
}
