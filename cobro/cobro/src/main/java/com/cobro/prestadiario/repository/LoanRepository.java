package com.cobro.prestadiario.repository;

import com.cobro.prestadiario.model.Loan;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface LoanRepository extends MongoRepository<Loan, String> {
    List<Loan> findByClientId(String clientId);
    List<Loan> findByStatus(String status);
    List<Loan> findByCreatedBy(String employeeId);
    List<Loan> findByClientIdIn(List<String> clientIds);
}
