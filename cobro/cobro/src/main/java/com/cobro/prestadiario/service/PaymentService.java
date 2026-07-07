package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.Payment;
import com.cobro.prestadiario.model.PaymentDto;

import java.util.List;

public interface PaymentService {
    Payment createPayment(PaymentDto paymentDto, String employeeId);
    List<Payment> getPaymentsByLoanId(String loanId);
    List<Payment> getPaymentsByEmployeeId(String employeeId);
    Payment getPaymentById(String id);
    Payment updatePayment(String paymentId, PaymentDto paymentDto, String employeeId);
    List<Payment> getAllPayments();
}
