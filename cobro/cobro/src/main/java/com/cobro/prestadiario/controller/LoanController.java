package com.cobro.prestadiario.controller;

import com.cobro.prestadiario.model.LoanDto;
import com.cobro.prestadiario.model.Loan;
import com.cobro.prestadiario.config.UserDetailsImpl;
import com.cobro.prestadiario.service.LoanService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/loans")
public class LoanController {

    private final LoanService loanService;

    public LoanController(LoanService loanService) {
        this.loanService = loanService;
    }

    @GetMapping
    public ResponseEntity<List<Loan>> getAllLoans(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        String role = userDetails.getAuthorities().iterator().next().getAuthority();
        return ResponseEntity.ok(loanService.getAllLoans(userDetails.getId(), role));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Loan> getLoanById(@PathVariable String id) {
        return ResponseEntity.ok(loanService.getLoanById(id));
    }

    @GetMapping("/client/{clientId}")
    public ResponseEntity<List<Loan>> getLoansByClientId(@PathVariable String clientId) {
        return ResponseEntity.ok(loanService.getLoansByClientId(clientId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Loan> createLoan(@Valid @RequestBody LoanDto loanDto, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(loanService.createLoan(loanDto, userDetails.getId()));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Loan> updateLoanStatus(@PathVariable String id, @RequestParam String status) {
        return ResponseEntity.ok(loanService.updateLoanStatus(id, status));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Void> deleteLoan(@PathVariable String id) {
        loanService.deleteLoan(id);
        return ResponseEntity.noContent().build();
    }
}
