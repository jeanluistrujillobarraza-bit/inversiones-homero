package com.cobro.prestadiario.controller;

import com.cobro.prestadiario.model.Loan;
import com.cobro.prestadiario.model.Payment;
import com.cobro.prestadiario.model.Expense;
import com.cobro.prestadiario.model.CashClosing;
import com.cobro.prestadiario.model.Client;
import com.cobro.prestadiario.config.UserDetailsImpl;
import com.cobro.prestadiario.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/payments")
    public ResponseEntity<List<Payment>> getPaymentsReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @RequestParam(required = false) String employeeId,
            @RequestParam(required = false) String paymentMethod,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        String role = userDetails.getAuthorities().iterator().next().getAuthority();
        String targetEmployeeId = "ROLE_EMPLOYEE".equals(role) ? userDetails.getId() : employeeId;

        return ResponseEntity.ok(reportService.getPaymentsReport(start, end, targetEmployeeId, paymentMethod));
    }

    @GetMapping("/loans")
    public ResponseEntity<List<Loan>> getLoansReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String employeeId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        String role = userDetails.getAuthorities().iterator().next().getAuthority();
        String targetEmployeeId = "ROLE_EMPLOYEE".equals(role) ? userDetails.getId() : employeeId;

        return ResponseEntity.ok(reportService.getLoansReport(start, end, status, targetEmployeeId));
    }

    @GetMapping("/expenses")
    public ResponseEntity<List<Expense>> getExpensesReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String responsible) {
        return ResponseEntity.ok(reportService.getExpensesReport(start, end, category, responsible));
    }

    @GetMapping("/closings")
    public ResponseEntity<List<CashClosing>> getClosingsReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @RequestParam(required = false) String closedBy) {
        return ResponseEntity.ok(reportService.getClosingsReport(start, end, closedBy));
    }

    @GetMapping("/clients")
    public ResponseEntity<List<Client>> getClientsReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String employeeId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        String role = userDetails.getAuthorities().iterator().next().getAuthority();
        String targetEmployeeId = "ROLE_EMPLOYEE".equals(role) ? userDetails.getId() : employeeId;

        return ResponseEntity.ok(reportService.getClientsReport(start, end, active, targetEmployeeId));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportReport(
            @RequestParam String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @RequestParam(required = false) String employeeId,
            @RequestParam(required = false) String extraParam,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        String role = userDetails.getAuthorities().iterator().next().getAuthority();
        String targetEmployeeId = "ROLE_EMPLOYEE".equals(role) ? userDetails.getId() : employeeId;

        byte[] csvData = reportService.exportReportToCsv(type, start, end, targetEmployeeId, extraParam);
        String filename = "reporte_" + type.toLowerCase() + "_" + LocalDate.now() + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csvData);
    }
}
