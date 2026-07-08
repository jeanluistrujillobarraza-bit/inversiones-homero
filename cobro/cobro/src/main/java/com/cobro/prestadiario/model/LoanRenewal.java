package com.cobro.prestadiario.model;

import java.time.LocalDateTime;

public class LoanRenewal {
    private LocalDateTime renewalDate = LocalDateTime.now();
    private Double previousOutstandingBalance;
    private Double additionalAmount;
    private Double newCapital;
    private Double newTotalToPay;
    private String createdBy;
    private String notes;

    public LoanRenewal() {}

    public LocalDateTime getRenewalDate() {
        return renewalDate;
    }

    public void setRenewalDate(LocalDateTime renewalDate) {
        this.renewalDate = renewalDate;
    }

    public Double getPreviousOutstandingBalance() {
        return previousOutstandingBalance;
    }

    public void setPreviousOutstandingBalance(Double previousOutstandingBalance) {
        this.previousOutstandingBalance = previousOutstandingBalance;
    }

    public Double getAdditionalAmount() {
        return additionalAmount;
    }

    public void setAdditionalAmount(Double additionalAmount) {
        this.additionalAmount = additionalAmount;
    }

    public Double getNewCapital() {
        return newCapital;
    }

    public void setNewCapital(Double newCapital) {
        this.newCapital = newCapital;
    }

    public Double getNewTotalToPay() {
        return newTotalToPay;
    }

    public void setNewTotalToPay(Double newTotalToPay) {
        this.newTotalToPay = newTotalToPay;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
