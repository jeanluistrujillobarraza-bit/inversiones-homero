package com.cobro.prestadiario.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

import java.util.List;
import java.time.temporal.ChronoUnit;

@Document(collection = "loans")
public class Loan {

    @Id
    private String id;
    private String clientId;
    private Double amount;
    private String loanType;
    private Double interestRate;
    private Double interestValue;
    private Double totalToPay;
    private Integer installmentsCount;
    private Double installmentValue;
    private LocalDate startDate;
    private LocalDate endDateEstimated;
    private String status = "ACTIVO";
    private Double amountPaid = 0.0;
    private Double balanceOutstanding;
    private Integer installmentsPaid = 0;
    private Integer installmentsRemaining;
    private Integer installmentsLate = 0;
    private String createdBy;
    private LocalDateTime createdAt = LocalDateTime.now();
    private Double rolledOverPayments = 0.0;
    private List<LoanRenewal> renewals = new java.util.ArrayList<>();

    public Loan() {}

    public void recalculateState(List<Payment> payments) {
        double totalPaid = payments.stream().mapToDouble(Payment::getAmount).sum();
        double activePaid = totalPaid - (this.rolledOverPayments != null ? this.rolledOverPayments : 0.0);
        if (activePaid < 0.0) {
            activePaid = 0.0;
        }
        double balance = this.getTotalToPay() - activePaid;

        if (balance < 0.01) {
            balance = 0.0;
        }

        this.setAmountPaid(totalPaid);
        this.setBalanceOutstanding(balance);

        int installmentsPaidVal = (int) Math.round(activePaid / this.getInstallmentValue());
        if (installmentsPaidVal > this.getInstallmentsCount() || balance == 0.0) {
            installmentsPaidVal = this.getInstallmentsCount();
        }
        this.setInstallmentsPaid(installmentsPaidVal);
        this.setInstallmentsRemaining(this.getInstallmentsCount() - installmentsPaidVal);

        LocalDate today = LocalDate.now();
        if (today.isAfter(this.getStartDate()) && !"PAGADO".equalsIgnoreCase(this.getStatus()) && balance > 0.0) {
            long elapsed;
            if ("SEMANAL".equalsIgnoreCase(this.getLoanType())) {
                elapsed = ChronoUnit.WEEKS.between(this.getStartDate(), today);
            } else if ("QUINCENAL".equalsIgnoreCase(this.getLoanType())) {
                elapsed = ChronoUnit.DAYS.between(this.getStartDate(), today) / 15;
            } else if ("MENSUAL".equalsIgnoreCase(this.getLoanType())) {
                elapsed = ChronoUnit.MONTHS.between(this.getStartDate(), today);
            } else {
                elapsed = ChronoUnit.DAYS.between(this.getStartDate(), today);
            }
            int expectedInstallments = (int) Math.min(elapsed, this.getInstallmentsCount());
            int late = expectedInstallments - installmentsPaidVal;
            this.setInstallmentsLate(Math.max(0, late));
        } else {
            this.setInstallmentsLate(0);
        }

        if (balance == 0.0) {
            this.setStatus("PAGADO");
            this.setInstallmentsLate(0);
        } else if (this.getInstallmentsLate() > 0) {
            this.setStatus("ATRASADO");
        } else {
            this.setStatus("ACTIVO");
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getLoanType() { return loanType; }
    public void setLoanType(String loanType) { this.loanType = loanType; }

    public Double getInterestRate() { return interestRate; }
    public void setInterestRate(Double interestRate) { this.interestRate = interestRate; }

    public Double getInterestValue() { return interestValue; }
    public void setInterestValue(Double interestValue) { this.interestValue = interestValue; }

    public Double getTotalToPay() { return totalToPay; }
    public void setTotalToPay(Double totalToPay) { this.totalToPay = totalToPay; }

    public Integer getInstallmentsCount() { return installmentsCount; }
    public void setInstallmentsCount(Integer installmentsCount) { this.installmentsCount = installmentsCount; }

    public Double getInstallmentValue() { return installmentValue; }
    public void setInstallmentValue(Double installmentValue) { this.installmentValue = installmentValue; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDateEstimated() { return endDateEstimated; }
    public void setEndDateEstimated(LocalDate endDateEstimated) { this.endDateEstimated = endDateEstimated; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Double getAmountPaid() { return amountPaid; }
    public void setAmountPaid(Double amountPaid) { this.amountPaid = amountPaid; }

    public Double getBalanceOutstanding() { return balanceOutstanding; }
    public void setBalanceOutstanding(Double balanceOutstanding) { this.balanceOutstanding = balanceOutstanding; }

    public Integer getInstallmentsPaid() { return installmentsPaid; }
    public void setInstallmentsPaid(Integer installmentsPaid) { this.installmentsPaid = installmentsPaid; }

    public Integer getInstallmentsRemaining() { return installmentsRemaining; }
    public void setInstallmentsRemaining(Integer installmentsRemaining) { this.installmentsRemaining = installmentsRemaining; }

    public Integer getInstallmentsLate() { return installmentsLate; }
    public void setInstallmentsLate(Integer installmentsLate) { this.installmentsLate = installmentsLate; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Double getRolledOverPayments() { return rolledOverPayments; }
    public void setRolledOverPayments(Double rolledOverPayments) { this.rolledOverPayments = rolledOverPayments; }

    public List<LoanRenewal> getRenewals() { return renewals; }
    public void setRenewals(List<LoanRenewal> renewals) { this.renewals = renewals; }
}
