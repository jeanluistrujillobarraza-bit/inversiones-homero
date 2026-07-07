package com.cobro.prestadiario.controller;

import com.cobro.prestadiario.model.AuditLog;
import com.cobro.prestadiario.repository.AuditLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/audits")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    public AuditController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public ResponseEntity<List<AuditLog>> getAllAudits() {
        return ResponseEntity.ok(auditLogRepository.findByOrderByTimestampDesc());
    }
}
