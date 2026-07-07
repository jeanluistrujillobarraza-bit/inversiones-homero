package com.cobro.prestadiario.controller;

import com.cobro.prestadiario.model.CashClosing;
import com.cobro.prestadiario.config.UserDetailsImpl;
import com.cobro.prestadiario.service.CashClosingService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/cash-closing")
public class CashClosingController {

    private final CashClosingService cashClosingService;

    public CashClosingController(CashClosingService cashClosingService) {
        this.cashClosingService = cashClosingService;
    }

    @GetMapping("/preview")
    public ResponseEntity<CashClosing> getClosingPreview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        return ResponseEntity.ok(cashClosingService.getClosingPreview(targetDate));
    }

    @PostMapping
    public ResponseEntity<CashClosing> performClosing(
            @RequestBody CashClosing cashClosing, 
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(cashClosingService.performClosing(cashClosing, userDetails.getUsername()));
    }

    @GetMapping("/history")
    public ResponseEntity<List<CashClosing>> getClosingHistory() {
        return ResponseEntity.ok(cashClosingService.getClosingHistory());
    }
}
