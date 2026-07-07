package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.Loan;
import com.cobro.prestadiario.model.Payment;
import com.cobro.prestadiario.model.Expense;
import com.cobro.prestadiario.model.CashClosing;
import com.cobro.prestadiario.model.Client;

import java.time.LocalDate;
import java.util.List;

public interface ReportService {
    List<Payment> getPaymentsReport(LocalDate start, LocalDate end, String employeeId, String paymentMethod);
    List<Loan> getLoansReport(LocalDate start, LocalDate end, String status, String employeeId);
    List<Expense> getExpensesReport(LocalDate start, LocalDate end, String category, String responsible);
    List<CashClosing> getClosingsReport(LocalDate start, LocalDate end, String closedBy);
    List<Client> getClientsReport(LocalDate start, LocalDate end, Boolean active, String employeeId);
    byte[] exportReportToCsv(String type, LocalDate start, LocalDate end, String employeeId, String extraParam);
}
