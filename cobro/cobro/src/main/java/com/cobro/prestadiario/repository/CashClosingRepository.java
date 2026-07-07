package com.cobro.prestadiario.repository;

import com.cobro.prestadiario.model.CashClosing;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CashClosingRepository extends MongoRepository<CashClosing, String> {
    Optional<CashClosing> findByDate(LocalDate date);
    List<CashClosing> findByDateBetween(LocalDate startDate, LocalDate endDate);
}
