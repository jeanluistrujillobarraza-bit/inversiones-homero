package com.cobro.prestadiario.model;

import java.util.List;
import java.util.Map;

public class DashboardDto {
    private Double totalCapitalLent;
    private Double totalLentWithInterest;
    private Double balanceOutstanding;
    private Double totalRecovered;
    private Double interestGenerated;
    private Double realizedProfits;
    private Double pendingProfits;
    private Double dailyCollection;
    private Double weeklyCollection;
    private Double monthlyCollection;
    private Double cashCollection;
    private Double nequiCollection;
    private Long activeClientsCount;
    private Long activeLoansCount;
    private Long paidLoansCount;
    private Long lateClientsCount;
    private Integer lateInstallmentsCount;

    private List<Map<String, Object>> dailyCollectionsChart;
    private List<Map<String, Object>> weeklyCollectionsChart;
    private List<Map<String, Object>> monthlyCollectionsChart;
    private Map<String, Double> paymentMethodChart;

    // New Fields
    private Double dailyExpenses;
    private Double weeklyExpenses;
    private Double fortnightlyExpenses;
    private Double monthlyExpenses;
    private Double dailyUtility;
    private Double monthlyUtility;
    private Double currentCash;
    private Double expectedCash;
    private String closedCash; // "CERRADA" or closing amount or "ABIERTA"

    private Double fortnightlyCollection;
    private Double weeklyRealizedProfits;
    private Double fortnightlyRealizedProfits;
    private Double monthlyRealizedProfits;

    public Double getFortnightlyCollection() { return fortnightlyCollection; }
    public void setFortnightlyCollection(Double fortnightlyCollection) { this.fortnightlyCollection = fortnightlyCollection; }

    public Double getWeeklyRealizedProfits() { return weeklyRealizedProfits; }
    public void setWeeklyRealizedProfits(Double weeklyRealizedProfits) { this.weeklyRealizedProfits = weeklyRealizedProfits; }

    public Double getFortnightlyRealizedProfits() { return fortnightlyRealizedProfits; }
    public void setFortnightlyRealizedProfits(Double fortnightlyRealizedProfits) { this.fortnightlyRealizedProfits = fortnightlyRealizedProfits; }

    public Double getMonthlyRealizedProfits() { return monthlyRealizedProfits; }
    public void setMonthlyRealizedProfits(Double monthlyRealizedProfits) { this.monthlyRealizedProfits = monthlyRealizedProfits; }

    public Double getDailyExpenses() { return dailyExpenses; }
    public void setDailyExpenses(Double dailyExpenses) { this.dailyExpenses = dailyExpenses; }

    public Double getWeeklyExpenses() { return weeklyExpenses; }
    public void setWeeklyExpenses(Double weeklyExpenses) { this.weeklyExpenses = weeklyExpenses; }

    public Double getFortnightlyExpenses() { return fortnightlyExpenses; }
    public void setFortnightlyExpenses(Double fortnightlyExpenses) { this.fortnightlyExpenses = fortnightlyExpenses; }

    public Double getMonthlyExpenses() { return monthlyExpenses; }
    public void setMonthlyExpenses(Double monthlyExpenses) { this.monthlyExpenses = monthlyExpenses; }

    public Double getDailyUtility() { return dailyUtility; }
    public void setDailyUtility(Double dailyUtility) { this.dailyUtility = dailyUtility; }

    public Double getMonthlyUtility() { return monthlyUtility; }
    public void setMonthlyUtility(Double monthlyUtility) { this.monthlyUtility = monthlyUtility; }

    public Double getCurrentCash() { return currentCash; }
    public void setCurrentCash(Double currentCash) { this.currentCash = currentCash; }

    public Double getExpectedCash() { return expectedCash; }
    public void setExpectedCash(Double expectedCash) { this.expectedCash = expectedCash; }

    public String getClosedCash() { return closedCash; }
    public void setClosedCash(String closedCash) { this.closedCash = closedCash; }

    public Double getTotalCapitalLent() { return totalCapitalLent; }
    public void setTotalCapitalLent(Double totalCapitalLent) { this.totalCapitalLent = totalCapitalLent; }

    public Double getTotalLentWithInterest() { return totalLentWithInterest; }
    public void setTotalLentWithInterest(Double totalLentWithInterest) { this.totalLentWithInterest = totalLentWithInterest; }

    public Double getBalanceOutstanding() { return balanceOutstanding; }
    public void setBalanceOutstanding(Double balanceOutstanding) { this.balanceOutstanding = balanceOutstanding; }

    public Double getTotalRecovered() { return totalRecovered; }
    public void setTotalRecovered(Double totalRecovered) { this.totalRecovered = totalRecovered; }

    public Double getInterestGenerated() { return interestGenerated; }
    public void setInterestGenerated(Double interestGenerated) { this.interestGenerated = interestGenerated; }

    public Double getRealizedProfits() { return realizedProfits; }
    public void setRealizedProfits(Double realizedProfits) { this.realizedProfits = realizedProfits; }

    public Double getPendingProfits() { return pendingProfits; }
    public void setPendingProfits(Double pendingProfits) { this.pendingProfits = pendingProfits; }

    public Double getDailyCollection() { return dailyCollection; }
    public void setDailyCollection(Double dailyCollection) { this.dailyCollection = dailyCollection; }

    public Double getWeeklyCollection() { return weeklyCollection; }
    public void setWeeklyCollection(Double weeklyCollection) { this.weeklyCollection = weeklyCollection; }

    public Double getMonthlyCollection() { return monthlyCollection; }
    public void setMonthlyCollection(Double monthlyCollection) { this.monthlyCollection = monthlyCollection; }

    public Double getCashCollection() { return cashCollection; }
    public void setCashCollection(Double cashCollection) { this.cashCollection = cashCollection; }

    public Double getNequiCollection() { return nequiCollection; }
    public void setNequiCollection(Double nequiCollection) { this.nequiCollection = nequiCollection; }

    public Long getActiveClientsCount() { return activeClientsCount; }
    public void setActiveClientsCount(Long activeClientsCount) { this.activeClientsCount = activeClientsCount; }

    public Long getActiveLoansCount() { return activeLoansCount; }
    public void setActiveLoansCount(Long activeLoansCount) { this.activeLoansCount = activeLoansCount; }

    public Long getPaidLoansCount() { return paidLoansCount; }
    public void setPaidLoansCount(Long paidLoansCount) { this.paidLoansCount = paidLoansCount; }

    public Long getLateClientsCount() { return lateClientsCount; }
    public void setLateClientsCount(Long lateClientsCount) { this.lateClientsCount = lateClientsCount; }

    public Integer getLateInstallmentsCount() { return lateInstallmentsCount; }
    public void setLateInstallmentsCount(Integer lateInstallmentsCount) { this.lateInstallmentsCount = lateInstallmentsCount; }

    public List<Map<String, Object>> getDailyCollectionsChart() { return dailyCollectionsChart; }
    public void setDailyCollectionsChart(List<Map<String, Object>> dailyCollectionsChart) { this.dailyCollectionsChart = dailyCollectionsChart; }

    public List<Map<String, Object>> getWeeklyCollectionsChart() { return weeklyCollectionsChart; }
    public void setWeeklyCollectionsChart(List<Map<String, Object>> weeklyCollectionsChart) { this.weeklyCollectionsChart = weeklyCollectionsChart; }

    public List<Map<String, Object>> getMonthlyCollectionsChart() { return monthlyCollectionsChart; }
    public void setMonthlyCollectionsChart(List<Map<String, Object>> monthlyCollectionsChart) { this.monthlyCollectionsChart = monthlyCollectionsChart; }

    public Map<String, Double> getPaymentMethodChart() { return paymentMethodChart; }
    public void setPaymentMethodChart(Map<String, Double> paymentMethodChart) { this.paymentMethodChart = paymentMethodChart; }
}
