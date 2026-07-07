package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.CashClosing;
import com.cobro.prestadiario.model.Payment;
import com.cobro.prestadiario.model.Loan;
import com.cobro.prestadiario.model.Expense;
import com.cobro.prestadiario.model.AuditLog;
import com.cobro.prestadiario.repository.CashClosingRepository;
import com.cobro.prestadiario.repository.PaymentRepository;
import com.cobro.prestadiario.repository.LoanRepository;
import com.cobro.prestadiario.repository.ExpenseRepository;
import com.cobro.prestadiario.repository.AuditLogRepository;
import com.cobro.prestadiario.exception.BadRequestException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class CashClosingServiceImpl implements CashClosingService {

    private final CashClosingRepository cashClosingRepository;
    private final PaymentRepository paymentRepository;
    private final LoanRepository loanRepository;
    private final ExpenseRepository expenseRepository;
    private final AuditLogRepository auditLogRepository;

    public CashClosingServiceImpl(CashClosingRepository cashClosingRepository,
                                   PaymentRepository paymentRepository,
                                   LoanRepository loanRepository,
                                   ExpenseRepository expenseRepository,
                                   AuditLogRepository auditLogRepository) {
        this.cashClosingRepository = cashClosingRepository;
        this.paymentRepository = paymentRepository;
        this.loanRepository = loanRepository;
        this.expenseRepository = expenseRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    public CashClosing getClosingPreview(LocalDate date) {
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(LocalTime.MAX);

        List<Payment> payments = paymentRepository.findAll().stream()
                .filter(p -> p.getPaymentDate().isAfter(startOfDay) && p.getPaymentDate().isBefore(endOfDay))
                .toList();

        List<Expense> expenses = expenseRepository.findByDate(date).stream()
                .filter(e -> "ACTIVO".equalsIgnoreCase(e.getStatus()))
                .toList();

        double totalPayments = 0.0;
        double capitalRecovered = 0.0;
        double interestCollected = 0.0;

        for (Payment p : payments) {
            totalPayments += p.getAmount();
            Loan loan = loanRepository.findById(p.getLoanId()).orElse(null);
            if (loan != null && loan.getTotalToPay() > 0) {
                double capitalRatio = loan.getAmount() / loan.getTotalToPay();
                double interestRatio = loan.getInterestValue() / loan.getTotalToPay();
                capitalRecovered += p.getAmount() * capitalRatio;
                interestCollected += p.getAmount() * interestRatio;
            } else {
                capitalRecovered += p.getAmount(); // fallback
            }
        }

        double totalExpenses = expenses.stream().mapToDouble(Expense::getValue).sum();
        double expectedMoney = totalPayments - totalExpenses;

        CashClosing closing = new CashClosing();
        closing.setDate(date);
        closing.setTime(LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss")));
        closing.setExpectedMoney(expectedMoney);
        closing.setTotalPayments(totalPayments);
        closing.setCapitalRecovered(capitalRecovered);
        closing.setInterestCollected(interestCollected);
        closing.setTotalExpenses(totalExpenses);
        closing.setRealMoney(expectedMoney); // default preview match
        closing.setDifference(0.0);
        closing.setDifferenceType("OK");

        return closing;
    }

    @Override
    public CashClosing performClosing(CashClosing cashClosing, String username) {
        // Re-calculate values server-side for safety
        CashClosing computed = getClosingPreview(cashClosing.getDate());
        
        double realMoney = cashClosing.getRealMoney();
        double difference = realMoney - computed.getExpectedMoney();
        
        cashClosing.setExpectedMoney(computed.getExpectedMoney());
        cashClosing.setTotalPayments(computed.getTotalPayments());
        cashClosing.setCapitalRecovered(computed.getCapitalRecovered());
        cashClosing.setInterestCollected(computed.getInterestCollected());
        cashClosing.setTotalExpenses(computed.getTotalExpenses());
        cashClosing.setDifference(difference);

        if (Math.abs(difference) < 0.01) {
            cashClosing.setDifference(0.0);
            cashClosing.setDifferenceType("OK");
        } else if (difference > 0) {
            cashClosing.setDifferenceType("SOBRANTE");
        } else {
            cashClosing.setDifferenceType("FALTANTE");
        }

        if (Math.abs(cashClosing.getDifference()) > 0.01) {
            if (cashClosing.getJustification() == null || cashClosing.getJustification().trim().isEmpty()) {
                throw new BadRequestException("Debe escribir una justificación obligatoria antes de realizar el cierre debido a la diferencia en caja.");
            }
        }

        cashClosing.setTime(LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss")));
        cashClosing.setStatus("CERRADO");
        CashClosing saved = cashClosingRepository.save(cashClosing);

        auditLogRepository.save(new AuditLog(
            username, 
            "CIERRE_CAJA", 
            "Se realizó el cierre de caja para la fecha " + cashClosing.getDate() + ". Esperado: " + cashClosing.getExpectedMoney() + ", Real: " + cashClosing.getRealMoney() + ", Diferencia: " + cashClosing.getDifference() + " (" + cashClosing.getDifferenceType() + ")"
        ));

        return saved;
    }

    @Override
    public List<CashClosing> getClosingHistory() {
        return cashClosingRepository.findAll().stream()
                .sorted((a, b) -> b.getDate().compareTo(a.getDate()))
                .toList();
    }
}
