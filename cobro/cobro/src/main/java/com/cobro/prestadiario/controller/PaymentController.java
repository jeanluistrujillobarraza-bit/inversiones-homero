package com.cobro.prestadiario.controller;

import com.cobro.prestadiario.model.PaymentDto;
import com.cobro.prestadiario.model.Payment;
import com.cobro.prestadiario.config.UserDetailsImpl;
import com.cobro.prestadiario.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping
    public ResponseEntity<Payment> createPayment(@Valid @RequestBody PaymentDto paymentDto, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(paymentService.createPayment(paymentDto, userDetails.getId()));
    }

    @GetMapping("/loan/{loanId}")
    public ResponseEntity<List<Payment>> getPaymentsByLoanId(@PathVariable String loanId) {
        return ResponseEntity.ok(paymentService.getPaymentsByLoanId(loanId));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<Payment>> getPaymentsByEmployeeId(@PathVariable String employeeId) {
        return ResponseEntity.ok(paymentService.getPaymentsByEmployeeId(employeeId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Payment> getPaymentById(@PathVariable String id) {
        return ResponseEntity.ok(paymentService.getPaymentById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Payment> updatePayment(@PathVariable String id, @Valid @RequestBody PaymentDto paymentDto, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(paymentService.updatePayment(id, paymentDto, userDetails.getId()));
    }

    @GetMapping
    public ResponseEntity<List<Payment>> getAllPayments() {
        return ResponseEntity.ok(paymentService.getAllPayments());
    }
}
