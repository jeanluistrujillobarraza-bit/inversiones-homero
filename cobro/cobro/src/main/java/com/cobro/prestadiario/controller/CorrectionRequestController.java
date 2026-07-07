package com.cobro.prestadiario.controller;

import com.cobro.prestadiario.model.CorrectionRequest;
import com.cobro.prestadiario.model.CorrectionRequestDto;
import com.cobro.prestadiario.config.UserDetailsImpl;
import com.cobro.prestadiario.service.CorrectionRequestService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/corrections")
public class CorrectionRequestController {

    private final CorrectionRequestService service;

    public CorrectionRequestController(CorrectionRequestService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<CorrectionRequest> createRequest(
            @Valid @RequestBody CorrectionRequestDto dto,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(service.createRequest(dto, userDetails.getId(), userDetails.getFullName()));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<List<CorrectionRequest>> getAllRequests() {
        return ResponseEntity.ok(service.getAllRequests());
    }

    @GetMapping("/employee")
    public ResponseEntity<List<CorrectionRequest>> getRequestsByEmployee(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(service.getRequestsByEmployee(userDetails.getId()));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<CorrectionRequest> approveRequest(@PathVariable String id) {
        return ResponseEntity.ok(service.approveRequest(id));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<CorrectionRequest> rejectRequest(@PathVariable String id) {
        return ResponseEntity.ok(service.rejectRequest(id));
    }
}
