package com.cobro.prestadiario.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

@Document(collection = "cash_closings")
public class CashClosing {

    @Id
    private String id;
    
    @NotNull
    private LocalDate date;
    
    @NotBlank
    private String time;
    
    @NotBlank
    private String closedBy;
    
    @NotNull
    private Double expectedMoney;
    
    @NotNull
    private Double totalPayments;
    
    @NotNull
    private Double capitalRecovered;
    
    @NotNull
    private Double interestCollected;
    
    @NotNull
    private Double totalExpenses;
    
    @NotNull
    private Double realMoney;
    
    @NotNull
    private Double difference;
    
    @NotBlank
    private String differenceType; // SOBRANTE, FALTANTE, OK
    
    private String justification; // Required if difference != 0
    
    private String status = "CERRADO";

    public CashClosing() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }

    public String getClosedBy() { return closedBy; }
    public void setClosedBy(String closedBy) { this.closedBy = closedBy; }

    public Double getExpectedMoney() { return expectedMoney; }
    public void setExpectedMoney(Double expectedMoney) { this.expectedMoney = expectedMoney; }

    public Double getTotalPayments() { return totalPayments; }
    public void setTotalPayments(Double totalPayments) { this.totalPayments = totalPayments; }

    public Double getCapitalRecovered() { return capitalRecovered; }
    public void setCapitalRecovered(Double capitalRecovered) { this.capitalRecovered = capitalRecovered; }

    public Double getInterestCollected() { return interestCollected; }
    public void setInterestCollected(Double interestCollected) { this.interestCollected = interestCollected; }

    public Double getTotalExpenses() { return totalExpenses; }
    public void setTotalExpenses(Double totalExpenses) { this.totalExpenses = totalExpenses; }

    public Double getRealMoney() { return realMoney; }
    public void setRealMoney(Double realMoney) { this.realMoney = realMoney; }

    public Double getDifference() { return difference; }
    public void setDifference(Double difference) { this.difference = difference; }

    public String getDifferenceType() { return differenceType; }
    public void setDifferenceType(String differenceType) { this.differenceType = differenceType; }

    public String getJustification() { return justification; }
    public void setJustification(String justification) { this.justification = justification; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
