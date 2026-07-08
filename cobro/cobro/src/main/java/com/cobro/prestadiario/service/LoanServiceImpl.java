package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.*;
import com.cobro.prestadiario.repository.*;
import com.cobro.prestadiario.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class LoanServiceImpl implements LoanService {

    private final LoanRepository loanRepository;
    private final ClientRepository clientRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;

    public LoanServiceImpl(LoanRepository loanRepository, ClientRepository clientRepository, PaymentRepository paymentRepository, UserRepository userRepository) {
        this.loanRepository = loanRepository;
        this.clientRepository = clientRepository;
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
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
    public Loan createLoan(LoanDto loanDto, String employeeId) {
        clientRepository.findById(loanDto.getClientId())
                .orElseThrow(() -> new ResourceNotFoundException("Client not found with id: " + loanDto.getClientId()));

        Loan loan = new Loan();
        loan.setClientId(loanDto.getClientId());
        loan.setAmount(loanDto.getAmount());
        loan.setLoanType(loanDto.getLoanType());
        loan.setInterestRate(loanDto.getInterestRate());

        double interestValue = loanDto.getAmount() * (loanDto.getInterestRate() / 100.0);
        double totalToPay = loanDto.getAmount() + interestValue;
        double installmentValue = totalToPay / loanDto.getInstallmentsCount();

        loan.setInterestValue(interestValue);
        loan.setTotalToPay(totalToPay);
        loan.setInstallmentsCount(loanDto.getInstallmentsCount());
        loan.setInstallmentValue(installmentValue);
        loan.setStartDate(loanDto.getStartDate());

        LocalDate endDate;
        if ("SEMANAL".equalsIgnoreCase(loanDto.getLoanType())) {
            endDate = loanDto.getStartDate().plusWeeks(loanDto.getInstallmentsCount());
        } else if ("QUINCENAL".equalsIgnoreCase(loanDto.getLoanType())) {
            endDate = loanDto.getStartDate().plusDays(loanDto.getInstallmentsCount() * 15L);
        } else if ("MENSUAL".equalsIgnoreCase(loanDto.getLoanType())) {
            endDate = loanDto.getStartDate().plusMonths(loanDto.getInstallmentsCount());
        } else {
            endDate = loanDto.getStartDate().plusDays(loanDto.getInstallmentsCount());
        }
        loan.setEndDateEstimated(endDate);

        loan.setBalanceOutstanding(totalToPay);
        loan.setInstallmentsRemaining(loanDto.getInstallmentsCount());
        loan.setCreatedBy(employeeId);
        loan.setStatus("ACTIVO");

        return loanRepository.save(loan);
    }

    @Override
    public Loan updateLoan(String id, LoanDto loanDto) {
        Loan loan = loanRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found with id: " + id));

        loan.setAmount(loanDto.getAmount());
        loan.setLoanType(loanDto.getLoanType());
        loan.setInterestRate(loanDto.getInterestRate());
        loan.setInstallmentsCount(loanDto.getInstallmentsCount());
        loan.setStartDate(loanDto.getStartDate());

        double interestValue = loanDto.getAmount() * (loanDto.getInterestRate() / 100.0);
        double totalToPay = loanDto.getAmount() + interestValue;
        double installmentValue = totalToPay / loanDto.getInstallmentsCount();

        loan.setInterestValue(interestValue);
        loan.setTotalToPay(totalToPay);
        loan.setInstallmentValue(installmentValue);

        LocalDate endDate;
        if ("SEMANAL".equalsIgnoreCase(loanDto.getLoanType())) {
            endDate = loanDto.getStartDate().plusWeeks(loanDto.getInstallmentsCount());
        } else if ("QUINCENAL".equalsIgnoreCase(loanDto.getLoanType())) {
            endDate = loanDto.getStartDate().plusDays(loanDto.getInstallmentsCount() * 15L);
        } else if ("MENSUAL".equalsIgnoreCase(loanDto.getLoanType())) {
            endDate = loanDto.getStartDate().plusMonths(loanDto.getInstallmentsCount());
        } else {
            endDate = loanDto.getStartDate().plusDays(loanDto.getInstallmentsCount());
        }
        loan.setEndDateEstimated(endDate);

        List<Payment> payments = paymentRepository.findByLoanId(loan.getId());
        loan.recalculateState(payments);

        return loanRepository.save(loan);
    }

    @Override
    public Loan renewLoan(String id, LoanDto renewalDto, String adminId) {
        Loan loan = getLoanById(id);

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + adminId));

        double previousOutstanding = loan.getBalanceOutstanding();
        double additionalAmount = renewalDto.getAmount();
        double newCapital = previousOutstanding + additionalAmount;

        double interestRate = renewalDto.getInterestRate();
        double interestValue = newCapital * (interestRate / 100.0);
        double newTotalToPay = newCapital + interestValue;
        double installmentValue = newTotalToPay / renewalDto.getInstallmentsCount();

        LoanRenewal renewal = new LoanRenewal();
        renewal.setPreviousOutstandingBalance(previousOutstanding);
        renewal.setAdditionalAmount(additionalAmount);
        renewal.setNewCapital(newCapital);
        renewal.setNewTotalToPay(newTotalToPay);
        renewal.setCreatedBy(admin.getFullName());
        renewal.setNotes(renewalDto.getNotes());
        
        if (loan.getRenewals() == null) {
            loan.setRenewals(new ArrayList<>());
        }
        loan.getRenewals().add(renewal);

        List<Payment> payments = paymentRepository.findByLoanId(loan.getId());
        double totalPaidSoFar = payments.stream().mapToDouble(Payment::getAmount).sum();
        loan.setRolledOverPayments(totalPaidSoFar);

        loan.setAmount(newCapital);
        loan.setLoanType(renewalDto.getLoanType());
        loan.setInterestRate(interestRate);
        loan.setInterestValue(interestValue);
        loan.setTotalToPay(newTotalToPay);
        loan.setInstallmentsCount(renewalDto.getInstallmentsCount());
        loan.setInstallmentValue(installmentValue);
        loan.setStartDate(renewalDto.getStartDate());

        LocalDate endDate;
        if ("SEMANAL".equalsIgnoreCase(renewalDto.getLoanType())) {
            endDate = renewalDto.getStartDate().plusWeeks(renewalDto.getInstallmentsCount());
        } else if ("QUINCENAL".equalsIgnoreCase(renewalDto.getLoanType())) {
            endDate = renewalDto.getStartDate().plusDays(renewalDto.getInstallmentsCount() * 15L);
        } else if ("MENSUAL".equalsIgnoreCase(renewalDto.getLoanType())) {
            endDate = renewalDto.getStartDate().plusMonths(renewalDto.getInstallmentsCount());
        } else {
            endDate = renewalDto.getStartDate().plusDays(renewalDto.getInstallmentsCount());
        }
        loan.setEndDateEstimated(endDate);

        loan.recalculateState(payments);

        return loanRepository.save(loan);
    }

    @Override
    public Loan updateLoanStatus(String id, String status) {
        Loan loan = getLoanById(id);
        loan.setStatus(status.toUpperCase());
        return loanRepository.save(loan);
    }

    @Override
    public void deleteLoan(String id) {
        Loan loan = getLoanById(id);
        loanRepository.delete(loan);
    }

    @Override
    public Loan getLoanById(String id) {
        Loan loan = loanRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found with id: " + id));
        if (!"PAGADO".equalsIgnoreCase(loan.getStatus())) {
            List<Payment> payments = paymentRepository.findByLoanId(loan.getId());
            loan.recalculateState(payments);
            loan = loanRepository.save(loan);
        }
        return loan;
    }

    @Override
    public List<Loan> getAllLoans(String currentUserId, String role) {
        List<Loan> result = loanRepository.findAll();
        recalculateActiveLoans(result);
        return result;
    }

    @Override
    public List<Loan> getLoansByClientId(String clientId) {
        List<Loan> loans = loanRepository.findByClientId(clientId);
        recalculateActiveLoans(loans);
        return loans;
    }
}
