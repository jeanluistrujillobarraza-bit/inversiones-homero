package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.DashboardDto;
import com.cobro.prestadiario.model.Client;
import com.cobro.prestadiario.model.Loan;
import com.cobro.prestadiario.model.Payment;
import com.cobro.prestadiario.model.Expense;
import com.cobro.prestadiario.model.CashClosing;
import com.cobro.prestadiario.repository.ClientRepository;
import com.cobro.prestadiario.repository.LoanRepository;
import com.cobro.prestadiario.repository.PaymentRepository;
import com.cobro.prestadiario.repository.ExpenseRepository;
import com.cobro.prestadiario.repository.CashClosingRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardServiceImpl implements DashboardService {

    private final LoanRepository loanRepository;
    private final PaymentRepository paymentRepository;
    private final ClientRepository clientRepository;
    private final ExpenseRepository expenseRepository;
    private final CashClosingRepository cashClosingRepository;

    public DashboardServiceImpl(LoanRepository loanRepository, 
                                PaymentRepository paymentRepository, 
                                ClientRepository clientRepository,
                                ExpenseRepository expenseRepository,
                                CashClosingRepository cashClosingRepository) {
        this.loanRepository = loanRepository;
        this.paymentRepository = paymentRepository;
        this.clientRepository = clientRepository;
        this.expenseRepository = expenseRepository;
        this.cashClosingRepository = cashClosingRepository;
    }

    private void recalculateActiveLoans(List<Loan> loans) {
        List<Loan> activeOrLateLoans = loans.stream()
                .filter(l -> !"PAGADO".equalsIgnoreCase(l.getStatus()))
                .collect(Collectors.toList());
        for (Loan loan : activeOrLateLoans) {
            List<Payment> payments = paymentRepository.findByLoanId(loan.getId());
            String oldStatus = loan.getStatus();
            int oldLate = loan.getInstallmentsLate();
            loan.recalculateState(payments);
            if (!oldStatus.equalsIgnoreCase(loan.getStatus()) || oldLate != loan.getInstallmentsLate()) {
                loanRepository.save(loan);
            }
        }
    }

    @Override
    public DashboardDto getDashboardStats(String currentUserId, String role) {
        List<Client> clients = clientRepository.findAll();
        List<Loan> loans = loanRepository.findAll();
        List<Payment> payments = paymentRepository.findAll();

        recalculateActiveLoans(loans);

        DashboardDto dto = new DashboardDto();

        double totalCapitalLent = loans.stream().mapToDouble(Loan::getAmount).sum();
        double totalLentWithInterest = loans.stream().mapToDouble(Loan::getTotalToPay).sum();
        double balanceOutstanding = loans.stream().mapToDouble(Loan::getBalanceOutstanding).sum();
        double totalRecovered = loans.stream().mapToDouble(Loan::getAmountPaid).sum();
        double interestGenerated = loans.stream().mapToDouble(Loan::getInterestValue).sum();

        double realizedProfits = loans.stream()
                .mapToDouble(l -> l.getTotalToPay() > 0 ? l.getInterestValue() * (l.getAmountPaid() / l.getTotalToPay()) : 0.0)
                .sum();
        double pendingProfits = loans.stream()
                .mapToDouble(l -> l.getTotalToPay() > 0 ? l.getInterestValue() * (l.getBalanceOutstanding() / l.getTotalToPay()) : 0.0)
                .sum();

        dto.setTotalCapitalLent(totalCapitalLent);
        dto.setTotalLentWithInterest(totalLentWithInterest);
        dto.setBalanceOutstanding(balanceOutstanding);
        dto.setTotalRecovered(totalRecovered);
        dto.setInterestGenerated(interestGenerated);
        dto.setRealizedProfits(realizedProfits);
        dto.setPendingProfits(pendingProfits);

        long activeClients = clients.stream().filter(Client::isActive).count();
        dto.setActiveClientsCount(activeClients);

        long activeLoans = loans.stream().filter(l -> "ACTIVO".equalsIgnoreCase(l.getStatus())).count();
        long paidLoans = loans.stream().filter(l -> "PAGADO".equalsIgnoreCase(l.getStatus())).count();
        long lateLoans = loans.stream().filter(l -> "ATRASADO".equalsIgnoreCase(l.getStatus()) || l.getInstallmentsLate() > 0).count();
        int lateInstallments = loans.stream().mapToInt(Loan::getInstallmentsLate).sum();

        dto.setActiveLoansCount(activeLoans);
        dto.setPaidLoansCount(paidLoans);
        dto.setLateClientsCount(lateLoans);
        dto.setLateInstallmentsCount(lateInstallments);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
        LocalDateTime startOfWeek = now.toLocalDate().minusDays(now.getDayOfWeek().getValue() - 1).atStartOfDay();
        LocalDate todayDate = now.toLocalDate();
        LocalDateTime startOfFortnight = todayDate.getDayOfMonth() <= 15 ? todayDate.withDayOfMonth(1).atStartOfDay() : todayDate.withDayOfMonth(16).atStartOfDay();
        LocalDateTime startOfMonth = now.toLocalDate().withDayOfMonth(1).atStartOfDay();

        double dailyCollection = payments.stream()
                .filter(p -> p.getPaymentDate().isAfter(startOfDay))
                .mapToDouble(Payment::getAmount)
                .sum();
        double weeklyCollection = payments.stream()
                .filter(p -> p.getPaymentDate().isAfter(startOfWeek))
                .mapToDouble(Payment::getAmount)
                .sum();
        double fortnightlyCollection = payments.stream()
                .filter(p -> p.getPaymentDate().isAfter(startOfFortnight))
                .mapToDouble(Payment::getAmount)
                .sum();
        double monthlyCollection = payments.stream()
                .filter(p -> p.getPaymentDate().isAfter(startOfMonth))
                .mapToDouble(Payment::getAmount)
                .sum();

        double cashCollection = payments.stream()
                .filter(p -> "EFECTIVO".equalsIgnoreCase(p.getPaymentMethod()))
                .mapToDouble(Payment::getAmount)
                .sum();
        double nequiCollection = payments.stream()
                .filter(p -> "NEQUI".equalsIgnoreCase(p.getPaymentMethod()))
                .mapToDouble(Payment::getAmount)
                .sum();

        dto.setDailyCollection(dailyCollection);
        dto.setWeeklyCollection(weeklyCollection);
        dto.setFortnightlyCollection(fortnightlyCollection);
        dto.setMonthlyCollection(monthlyCollection);
        dto.setCashCollection(cashCollection);
        dto.setNequiCollection(nequiCollection);

        // --- Expenses ---
        List<Expense> allExpenses = expenseRepository.findAll().stream()
                .filter(e -> "ACTIVO".equalsIgnoreCase(e.getStatus()))
                .toList();

        double dailyExpenses = allExpenses.stream()
                .filter(e -> !e.getDate().isBefore(todayDate) && !e.getDate().isAfter(todayDate))
                .mapToDouble(Expense::getValue)
                .sum();
        double weeklyExpenses = allExpenses.stream()
                .filter(e -> !e.getDate().isBefore(startOfWeek.toLocalDate()) && !e.getDate().isAfter(todayDate))
                .mapToDouble(Expense::getValue)
                .sum();
        double fortnightlyExpenses = allExpenses.stream()
                .filter(e -> !e.getDate().isBefore(startOfFortnight.toLocalDate()) && !e.getDate().isAfter(todayDate))
                .mapToDouble(Expense::getValue)
                .sum();
        double monthlyExpenses = allExpenses.stream()
                .filter(e -> !e.getDate().isBefore(startOfMonth.toLocalDate()) && !e.getDate().isAfter(todayDate))
                .mapToDouble(Expense::getValue)
                .sum();

        dto.setDailyExpenses(dailyExpenses);
        dto.setWeeklyExpenses(weeklyExpenses);
        dto.setFortnightlyExpenses(fortnightlyExpenses);
        dto.setMonthlyExpenses(monthlyExpenses);

        // --- Realized Profits (Ganancias) per period ---
        double dailyRealizedProfits = payments.stream()
                .filter(p -> p.getPaymentDate().isAfter(startOfDay))
                .mapToDouble(p -> {
                    Loan l = loanRepository.findById(p.getLoanId()).orElse(null);
                    return l != null && l.getTotalToPay() > 0 ? p.getAmount() * (l.getInterestValue() / l.getTotalToPay()) : 0.0;
                })
                .sum();
        double weeklyRealizedProfits = payments.stream()
                .filter(p -> p.getPaymentDate().isAfter(startOfWeek))
                .mapToDouble(p -> {
                    Loan l = loanRepository.findById(p.getLoanId()).orElse(null);
                    return l != null && l.getTotalToPay() > 0 ? p.getAmount() * (l.getInterestValue() / l.getTotalToPay()) : 0.0;
                })
                .sum();
        double fortnightlyRealizedProfits = payments.stream()
                .filter(p -> p.getPaymentDate().isAfter(startOfFortnight))
                .mapToDouble(p -> {
                    Loan l = loanRepository.findById(p.getLoanId()).orElse(null);
                    return l != null && l.getTotalToPay() > 0 ? p.getAmount() * (l.getInterestValue() / l.getTotalToPay()) : 0.0;
                })
                .sum();
        double monthlyRealizedProfits = payments.stream()
                .filter(p -> p.getPaymentDate().isAfter(startOfMonth))
                .mapToDouble(p -> {
                    Loan l = loanRepository.findById(p.getLoanId()).orElse(null);
                    return l != null && l.getTotalToPay() > 0 ? p.getAmount() * (l.getInterestValue() / l.getTotalToPay()) : 0.0;
                })
                .sum();

        dto.setWeeklyRealizedProfits(weeklyRealizedProfits);
        dto.setFortnightlyRealizedProfits(fortnightlyRealizedProfits);
        dto.setMonthlyRealizedProfits(monthlyRealizedProfits);

        dto.setDailyUtility(dailyRealizedProfits - dailyExpenses);
        dto.setMonthlyUtility(monthlyRealizedProfits - monthlyExpenses);

        // Overall collections and expenses
        double overallPayments = payments.stream().mapToDouble(Payment::getAmount).sum();
        double overallExpenses = allExpenses.stream().mapToDouble(Expense::getValue).sum();

        dto.setCurrentCash(overallPayments - overallExpenses);
        dto.setExpectedCash(dailyCollection - dailyExpenses);

        Optional<CashClosing> closingOpt = cashClosingRepository.findByDate(todayDate);
        if (closingOpt.isPresent()) {
            dto.setClosedCash(String.format("$%,.0f", closingOpt.get().getRealMoney()));
        } else {
            dto.setClosedCash("SIN CERRAR");
        }

        dto.setDailyCollectionsChart(getDailyChartData(payments));
        dto.setWeeklyCollectionsChart(getWeeklyChartData(payments));
        dto.setMonthlyCollectionsChart(getMonthlyChartData(payments));

        Map<String, Double> paymentMethodChart = new HashMap<>();
        paymentMethodChart.put("Efectivo", cashCollection);
        paymentMethodChart.put("Nequi", nequiCollection);
        dto.setPaymentMethodChart(paymentMethodChart);

        return dto;
    }

    private List<Map<String, Object>> getDailyChartData(List<Payment> payments) {
        List<Map<String, Object>> list = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM");
        LocalDate today = LocalDate.now();

        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.atTime(23, 59, 59);

            double sum = payments.stream()
                    .filter(p -> p.getPaymentDate().isAfter(start) && p.getPaymentDate().isBefore(end))
                    .mapToDouble(Payment::getAmount)
                    .sum();

            Map<String, Object> map = new HashMap<>();
            map.put("name", date.format(formatter));
            map.put("recaudo", sum);
            list.add(map);
        }
        return list;
    }

    private List<Map<String, Object>> getWeeklyChartData(List<Payment> payments) {
        List<Map<String, Object>> list = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (int i = 3; i >= 0; i--) {
            LocalDate weekStart = today.minusWeeks(i).minusDays(today.minusWeeks(i).getDayOfWeek().getValue() - 1);
            LocalDateTime start = weekStart.atStartOfDay();
            LocalDateTime end = weekStart.plusDays(6).atTime(23, 59, 59);

            double sum = payments.stream()
                    .filter(p -> p.getPaymentDate().isAfter(start) && p.getPaymentDate().isBefore(end))
                    .mapToDouble(Payment::getAmount)
                    .sum();

            Map<String, Object> map = new HashMap<>();
            map.put("name", "Semana " + weekStart.format(DateTimeFormatter.ofPattern("dd/MM")));
            map.put("recaudo", sum);
            list.add(map);
        }
        return list;
    }

    private List<Map<String, Object>> getMonthlyChartData(List<Payment> payments) {
        List<Map<String, Object>> list = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM", new Locale("es", "CO"));
        LocalDate today = LocalDate.now();

        for (int i = 5; i >= 0; i--) {
            LocalDate monthDate = today.minusMonths(i);
            LocalDateTime start = monthDate.withDayOfMonth(1).atStartOfDay();
            LocalDateTime end = monthDate.withDayOfMonth(monthDate.lengthOfMonth()).atTime(23, 59, 59);

            double sum = payments.stream()
                    .filter(p -> p.getPaymentDate().isAfter(start) && p.getPaymentDate().isBefore(end))
                    .mapToDouble(Payment::getAmount)
                    .sum();

            Map<String, Object> map = new HashMap<>();
            map.put("name", monthDate.format(formatter).toUpperCase());
            map.put("recaudo", sum);
            list.add(map);
        }
        return list;
    }
}
