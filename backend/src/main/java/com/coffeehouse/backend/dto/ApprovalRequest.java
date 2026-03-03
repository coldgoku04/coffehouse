package com.coffeehouse.backend.dto;

import lombok.Data;

@Data
public class ApprovalRequest {
    private String userId;           // User to approve/reject
    private String action;           // "APPROVE" or "REJECT"
    private String rejectionReason;  // Optional, if REJECT
    private String assignedRole;     // Optional, e.g. CUSTOMER, ADMIN
}