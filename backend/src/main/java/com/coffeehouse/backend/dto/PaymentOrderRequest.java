package com.coffeehouse.backend.dto;

import lombok.Data;

@Data
public class PaymentOrderRequest {
    private Long amount; // Amount in paise
    private String currency;
    private String receipt;
}
