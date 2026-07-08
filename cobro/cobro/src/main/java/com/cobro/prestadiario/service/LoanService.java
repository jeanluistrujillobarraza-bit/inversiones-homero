package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.Loan;
import com.cobro.prestadiario.model.LoanDto;

import java.util.List;

public interface LoanService {
    Loan createLoan(LoanDto loanDto, String employeeId);
    Loan updateLoan(String id, LoanDto loanDto);
    Loan renewLoan(String id, LoanDto renewalDto, String adminId);
    Loan updateLoanStatus(String id, String status);
    void deleteLoan(String id);
    Loan getLoanById(String id);
    List<Loan> getAllLoans(String currentUserId, String role);
    List<Loan> getLoansByClientId(String clientId);
}
