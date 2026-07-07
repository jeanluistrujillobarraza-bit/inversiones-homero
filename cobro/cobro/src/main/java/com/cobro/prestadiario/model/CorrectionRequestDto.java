package com.cobro.prestadiario.model;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class CorrectionRequestDto {

    @NotNull(message = "Payment ID is required")
    private String paymentId;

    @NotNull(message = "Requested amount is required")
    @Positive(message = "Requested amount must be positive")
    private Double requestedAmount;

    @NotNull(message = "Reason is required")
    private String reason;

    public String getPaymentId() { return paymentId; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }

    public Double getRequestedAmount() { return requestedAmount; }
    public void setRequestedAmount(Double requestedAmount) { this.requestedAmount = requestedAmount; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
