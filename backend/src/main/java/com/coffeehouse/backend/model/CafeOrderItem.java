package com.coffeehouse.backend.model;

import lombok.Data;

@Data
public class CafeOrderItem {
    private String menuItemId;
    private String name;
    private Double price;
    private Integer quantity;
}
