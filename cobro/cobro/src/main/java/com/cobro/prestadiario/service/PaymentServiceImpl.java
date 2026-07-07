package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.PaymentDto;
import com.cobro.prestadiario.model.Loan;
import com.cobro.prestadiario.model.Payment;
import com.cobro.prestadiario.exception.BadRequestException;
import com.cobro.prestadiario.exception.ResourceNotFoundException;
import com.cobro.prestadiario.repository.LoanRepository;
import com.cobro.prestadiario.repository.PaymentRepository;
import com.cobro.prestadiario.model.AuditLog;
import com.cobro.prestadiario.model.User;
import com.cobro.prestadiario.repository.AuditLogRepository;
import com.cobro.prestadiario.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final LoanRepository loanRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    public PaymentServiceImpl(PaymentRepository paymentRepository, LoanRepository loanRepository, UserRepository userRepository, AuditLogRepository auditLogRepository) {
        this.paymentRepository = paymentRepository;
        this.loanRepository = loanRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    public Payment createPayment(PaymentDto paymentDto, String employeeId) {
        Loan loan = loanRepository.findById(paymentDto.getLoanId())
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found with id: " + paymentDto.getLoanId()));

        if ("PAGADO".equalsIgnoreCase(loan.getStatus())) {
            throw new BadRequestException("This loan is already fully paid.");
        }

        if (paymentDto.getAmount() > loan.getBalanceOutstanding()) {
            throw new BadRequestException("Payment amount (" + paymentDto.getAmount() + ") cannot exceed outstanding balance (" + loan.getBalanceOutstanding() + ").");
        }

        Payment payment = new Payment();
        payment.setLoanId(paymentDto.getLoanId());
        payment.setAmount(paymentDto.getAmount());
        payment.setPaymentMethod(paymentDto.getPaymentMethod().toUpperCase());
        payment.setCollectedById(employeeId);
        payment.setNotes(paymentDto.getNotes());
        payment.setPaymentDate(LocalDateTime.now());
        Payment savedPayment = paymentRepository.save(payment);

        recalculateLoan(loan);

        String username = userRepository.findById(employeeId).map(User::getUsername).orElse("Desconocido");
        auditLogRepository.save(new AuditLog(
            username,
            "REGISTRO_PAGO",
            "Se registró un pago por valor de " + payment.getAmount() + " para el préstamo ID " + loan.getId() + " mediante " + payment.getPaymentMethod()
        ));

        return savedPayment;
    }

    @Override
    public Payment updatePayment(String paymentId, PaymentDto paymentDto, String employeeId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + paymentId));

        Loan loan = loanRepository.findById(payment.getLoanId())
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found with id: " + payment.getLoanId()));

        double otherPaymentsSum = loan.getAmountPaid() - payment.getAmount();
        double maxAllowedAmount = loan.getTotalToPay() - otherPaymentsSum;

        if (paymentDto.getAmount() > maxAllowedAmount) {
            throw new BadRequestException("New payment amount (" + paymentDto.getAmount() + ") cannot exceed outstanding balance before this payment (" + maxAllowedAmount + ").");
        }

        double oldAmount = payment.getAmount();
        payment.setAmount(paymentDto.getAmount());
        payment.setPaymentMethod(paymentDto.getPaymentMethod().toUpperCase());
        payment.setNotes(paymentDto.getNotes());
        Payment savedPayment = paymentRepository.save(payment);

        recalculateLoan(loan);

        String username = userRepository.findById(employeeId).map(User::getUsername).orElse("Desconocido");
        auditLogRepository.save(new AuditLog(
            username,
            "MODIFICACION_PAGO",
            "Se modificó el pago ID " + paymentId + " del préstamo ID " + loan.getId() + ". Valor anterior: " + oldAmount + ", Nuevo valor: " + payment.getAmount()
        ));

        return savedPayment;
    }

    private void recalculateLoan(Loan loan) {
        List<Payment> payments = paymentRepository.findByLoanId(loan.getId());
        loan.recalculateState(payments);
        loanRepository.save(loan);
    }

    @Override
    public List<Payment> getPaymentsByLoanId(String loanId) {
        return paymentRepository.findByLoanId(loanId);
    }

    @Override
    public List<Payment> getPaymentsByEmployeeId(String employeeId) {
        return paymentRepository.findByCollectedById(employeeId);
    }

    @Override
    public Payment getPaymentById(String id) {
        return paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));
    }

    @Override
    public List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }
}
