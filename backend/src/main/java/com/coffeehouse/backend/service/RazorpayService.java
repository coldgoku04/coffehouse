package com.coffeehouse.backend.service;

import com.coffeehouse.backend.dto.PaymentOrderResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;

@Service
public class RazorpayService {
    private final String keyId;
    private final String keySecret;
    private final RestClient restClient;

    public RazorpayService(
            @Value("${razorpay.key.id:}") String keyId,
            @Value("${razorpay.key.secret:}") String keySecret
    ) {
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.restClient = RestClient.builder()
                .baseUrl("https://api.razorpay.com/v1")
                .defaultHeaders(headers -> headers.setBasicAuth(keyId, keySecret))
                .build();
    }

    public PaymentOrderResponse createOrder(long amount, String currency, String receipt) {
        ensureKeysPresent();
        String safeCurrency = (currency == null || currency.isBlank()) ? "INR" : currency.trim().toUpperCase();

        Map<String, Object> payload = new HashMap<>();
        payload.put("amount", amount);
        payload.put("currency", safeCurrency);
        payload.put("payment_capture", 1);
        if (receipt != null && !receipt.isBlank()) {
            String safeReceipt = receipt.trim();
            if (safeReceipt.length() > 40) {
                safeReceipt = safeReceipt.substring(0, 40);
            }
            payload.put("receipt", safeReceipt);
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restClient.post()
                .uri("/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(Map.class);

        if (response == null || response.get("id") == null) {
            throw new IllegalStateException("Razorpay order creation failed.");
        }

        String orderId = String.valueOf(response.get("id"));
        Number responseAmount = (Number) response.get("amount");
        String responseCurrency = response.get("currency") == null ? safeCurrency : String.valueOf(response.get("currency"));
        Long finalAmount = responseAmount == null ? amount : responseAmount.longValue();

        return new PaymentOrderResponse(orderId, finalAmount, responseCurrency, keyId);
    }

    public boolean verifySignature(String orderId, String paymentId, String signature) {
        ensureKeysPresent();
        if (isBlank(orderId) || isBlank(paymentId) || isBlank(signature)) {
            return false;
        }
        String payload = orderId + "|" + paymentId;
        String expected = hmacSha256Hex(payload, keySecret);
        return expected.equals(signature);
    }

    private void ensureKeysPresent() {
        if (isBlank(keyId) || isBlank(keySecret)) {
            throw new IllegalStateException("Razorpay keys are not configured.");
        }
    }

    private String hmacSha256Hex(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to verify Razorpay signature.");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
