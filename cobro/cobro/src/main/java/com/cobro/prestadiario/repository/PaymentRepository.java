package com.cobro.prestadiario.repository;

import com.cobro.prestadiario.model.Payment;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface PaymentRepository extends MongoRepository<Payment, String> {
    List<Payment> findByLoanId(String loanId);
    List<Payment> findByCollectedById(String employeeId);
    List<Payment> findByLoanIdIn(List<String> loanIds);
}
