package com.coffeehouse.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PaymentOrderResponse {
    private String orderId;
    private Long amount;
    private String currency;
    private String keyId;
}
