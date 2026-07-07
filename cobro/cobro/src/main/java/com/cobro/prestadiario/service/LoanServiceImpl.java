package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.LoanDto;
import com.cobro.prestadiario.model.Client;
import com.cobro.prestadiario.model.Loan;
import com.cobro.prestadiario.model.Payment;
import com.cobro.prestadiario.exception.ResourceNotFoundException;
import com.cobro.prestadiario.repository.ClientRepository;
import com.cobro.prestadiario.repository.LoanRepository;
import com.cobro.prestadiario.repository.PaymentRepository;
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

    public LoanServiceImpl(LoanRepository loanRepository, ClientRepository clientRepository, PaymentRepository paymentRepository) {
        this.loanRepository = loanRepository;
        this.clientRepository = clientRepository;
        this.paymentRepository = paymentRepository;
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
        List<Loan> result;
        if ("ROLE_EMPLOYEE".equals(role)) {
            List<Client> assignedClients = clientRepository.findByAssignedEmployeeId(currentUserId);
            List<String> clientIds = assignedClients.stream().map(Client::getId).collect(Collectors.toList());

            List<Loan> clientLoans = loanRepository.findByClientIdIn(clientIds);
            List<Loan> createdLoans = loanRepository.findByCreatedBy(currentUserId);

            Set<Loan> allLoans = new HashSet<>(clientLoans);
            allLoans.addAll(createdLoans);

            result = new ArrayList<>(allLoans);
        } else {
            result = loanRepository.findAll();
        }
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
