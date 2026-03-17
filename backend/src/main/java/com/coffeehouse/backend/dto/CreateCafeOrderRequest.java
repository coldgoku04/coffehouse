package com.coffeehouse.backend.dto;

import com.coffeehouse.backend.model.CafeOrderItem;
import lombok.Data;

import java.util.List;

@Data
public class CreateCafeOrderRequest {
    private String tableId;
    private String tableNumber;
    private String customerId;
    private String customerName;
    private String bookingDateTime;
    private Integer durationMinutes;
    private String specialRequests;
    private List<CafeOrderItem> items;
}
