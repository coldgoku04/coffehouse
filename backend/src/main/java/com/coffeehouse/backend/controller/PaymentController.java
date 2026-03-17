package com.coffeehouse.backend.controller;

import com.coffeehouse.backend.dto.PaymentOrderRequest;
import com.coffeehouse.backend.dto.PaymentOrderResponse;
import com.coffeehouse.backend.dto.PaymentVerifyRequest;
import com.coffeehouse.backend.service.RazorpayService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class PaymentController {
    private final RazorpayService razorpayService;

    public PaymentController(RazorpayService razorpayService) {
        this.razorpayService = razorpayService;
    }

    @PostMapping("/orders")
    public ResponseEntity<?> createOrder(@RequestBody PaymentOrderRequest request) {
        if (request == null || request.getAmount() == null || request.getAmount() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Valid amount is required."));
        }
        String currency = request.getCurrency() == null ? "INR" : request.getCurrency().trim().toUpperCase();
        PaymentOrderResponse response = razorpayService.createOrder(request.getAmount(), currency, request.getReceipt());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@RequestBody PaymentVerifyRequest request) {
        if (request == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid payment verification request."));
        }
        boolean verified = razorpayService.verifySignature(request.getOrderId(), request.getPaymentId(), request.getSignature());
        if (!verified) {
            return ResponseEntity.badRequest().body(Map.of("message", "Payment verification failed."));
        }
        return ResponseEntity.ok(Map.of("verified", true));
    }
}
