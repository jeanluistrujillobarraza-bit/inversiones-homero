package com.cobro.prestadiario.repository;

import com.cobro.prestadiario.model.AuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
    List<AuditLog> findByOrderByTimestampDesc();
}
