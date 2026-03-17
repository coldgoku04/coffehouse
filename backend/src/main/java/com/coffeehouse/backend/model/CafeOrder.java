package com.coffeehouse.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Document(collection = "cafe_orders")
public class CafeOrder {
    @Id
    private String id;

    @Indexed
    private String cafeId;

    private String tableId;
    private String tableNumber;
    private String customerId;
    private String customerName;
    private LocalDateTime bookingDateTime;
    private Integer durationMinutes;
    private String specialRequests;
    private List<CafeOrderItem> items;
    private Double totalAmount;
    private String status; // PLACED, ACCEPTED, COOKING, READY, SERVING, SERVED, COMPLETED, CANCELLED, REJECTED
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public CafeOrder() {
        this.items = new ArrayList<>();
        this.status = "PLACED";
        this.durationMinutes = 60;
        this.totalAmount = 0.0;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
}
