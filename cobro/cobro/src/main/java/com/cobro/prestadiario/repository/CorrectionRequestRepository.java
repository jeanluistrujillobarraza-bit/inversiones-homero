package com.cobro.prestadiario.repository;

import com.cobro.prestadiario.model.CorrectionRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CorrectionRequestRepository extends MongoRepository<CorrectionRequest, String> {
    List<CorrectionRequest> findByEmployeeId(String employeeId);
}
