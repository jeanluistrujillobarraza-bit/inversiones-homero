package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.*;
import com.cobro.prestadiario.repository.*;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReportServiceImpl implements ReportService {

    private final PaymentRepository paymentRepository;
    private final LoanRepository loanRepository;
    private final ClientRepository clientRepository;
    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;
    private final CashClosingRepository cashClosingRepository;

    public ReportServiceImpl(PaymentRepository paymentRepository,
                             LoanRepository loanRepository,
                             ClientRepository clientRepository,
                             UserRepository userRepository,
                             ExpenseRepository expenseRepository,
                             CashClosingRepository cashClosingRepository) {
        this.paymentRepository = paymentRepository;
        this.loanRepository = loanRepository;
        this.clientRepository = clientRepository;
        this.userRepository = userRepository;
        this.expenseRepository = expenseRepository;
        this.cashClosingRepository = cashClosingRepository;
    }

    @Override
    public List<Payment> getPaymentsReport(LocalDate start, LocalDate end, String employeeId, String paymentMethod) {
        List<Payment> payments = paymentRepository.findAll();
        return payments.stream()
                .filter(p -> {
                    LocalDate date = p.getPaymentDate().toLocalDate();
                    boolean dateMatch = (start == null || !date.isBefore(start)) && (end == null || !date.isAfter(end));
                    boolean employeeMatch = (employeeId == null || employeeId.isEmpty() || employeeId.equals(p.getCollectedById()));
                    boolean methodMatch = (paymentMethod == null || paymentMethod.isEmpty() || paymentMethod.equalsIgnoreCase(p.getPaymentMethod()));
                    return dateMatch && employeeMatch && methodMatch;
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<Loan> getLoansReport(LocalDate start, LocalDate end, String status, String employeeId) {
        List<Loan> loans = loanRepository.findAll();
        return loans.stream()
                .filter(l -> {
                    LocalDate date = l.getCreatedAt().toLocalDate();
                    boolean dateMatch = (start == null || !date.isBefore(start)) && (end == null || !date.isAfter(end));
                    boolean statusMatch = (status == null || status.isEmpty() || status.equalsIgnoreCase(l.getStatus()));
                    boolean employeeMatch = (employeeId == null || employeeId.isEmpty() || employeeId.equals(l.getCreatedBy()));
                    return dateMatch && statusMatch && employeeMatch;
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<Expense> getExpensesReport(LocalDate start, LocalDate end, String category, String responsible) {
        List<Expense> expenses = expenseRepository.findAll();
        return expenses.stream()
                .filter(e -> {
                    LocalDate date = e.getDate();
                    boolean dateMatch = (start == null || !date.isBefore(start)) && (end == null || !date.isAfter(end));
                    boolean categoryMatch = (category == null || category.isEmpty() || category.equalsIgnoreCase(e.getCategory()));
                    boolean responsibleMatch = (responsible == null || responsible.isEmpty() || e.getResponsible().toLowerCase().contains(responsible.toLowerCase()));
                    return dateMatch && categoryMatch && responsibleMatch;
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<CashClosing> getClosingsReport(LocalDate start, LocalDate end, String closedBy) {
        List<CashClosing> closings = cashClosingRepository.findAll();
        return closings.stream()
                .filter(c -> {
                    LocalDate date = c.getDate();
                    boolean dateMatch = (start == null || !date.isBefore(start)) && (end == null || !date.isAfter(end));
                    boolean userMatch = (closedBy == null || closedBy.isEmpty() || c.getClosedBy().toLowerCase().contains(closedBy.toLowerCase()));
                    return dateMatch && userMatch;
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<Client> getClientsReport(LocalDate start, LocalDate end, Boolean active, String employeeId) {
        List<Client> clients = clientRepository.findAll();
        return clients.stream()
                .filter(c -> {
                    LocalDate date = c.getCreatedAt() != null ? c.getCreatedAt().toLocalDate() : LocalDate.now();
                    boolean dateMatch = (start == null || !date.isBefore(start)) && (end == null || !date.isAfter(end));
                    boolean activeMatch = (active == null || active.equals(c.isActive()));
                    boolean employeeMatch = (employeeId == null || employeeId.isEmpty() || employeeId.equals(c.getAssignedEmployeeId()));
                    return dateMatch && activeMatch && employeeMatch;
                })
                .collect(Collectors.toList());
    }

    @Override
    public byte[] exportReportToCsv(String type, LocalDate start, LocalDate end, String employeeId, String extraParam) {
        StringBuilder csv = new StringBuilder();
        DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        Map<String, String> userMap = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, User::getFullName, (a, b) -> a));
        Map<String, Client> clientMap = clientRepository.findAll().stream()
                .collect(Collectors.toMap(Client::getId, c -> c, (a, b) -> a));

        if ("PAYMENTS".equalsIgnoreCase(type)) {
            List<Payment> payments = getPaymentsReport(start, end, employeeId, extraParam);
            csv.append("ID Pago;ID Préstamo;Cliente;DNI Cliente;Fecha y Hora;Valor;Método de Pago;Recaudado Por\n");
            for (Payment p : payments) {
                Loan l = loanRepository.findById(p.getLoanId()).orElse(null);
                Client c = (l != null) ? clientMap.get(l.getClientId()) : null;
                String clientName = (c != null) ? c.getFullName() : "N/A";
                String clientDni = (c != null) ? c.getDni() : "N/A";
                String collector = userMap.getOrDefault(p.getCollectedById(), "N/A");

                csv.append(p.getId()).append(";")
                        .append(p.getLoanId()).append(";")
                        .append(clientName).append(";")
                        .append(clientDni).append(";")
                        .append(p.getPaymentDate().format(dateTimeFormatter)).append(";")
                        .append(p.getAmount()).append(";")
                        .append(p.getPaymentMethod()).append(";")
                        .append(collector).append("\n");
            }
        } else if ("EXPENSES".equalsIgnoreCase(type)) {
            List<Expense> expenses = getExpensesReport(start, end, extraParam, employeeId);
            csv.append("ID Gasto;Fecha;Hora;Valor;Categoría;Responsable;Método de Pago;Estado;Justificación;Observaciones\n");
            for (Expense e : expenses) {
                csv.append(e.getId()).append(";")
                        .append(e.getDate()).append(";")
                        .append(e.getTime()).append(";")
                        .append(e.getValue()).append(";")
                        .append(e.getCategory()).append(";")
                        .append(e.getResponsible()).append(";")
                        .append(e.getPaymentMethod()).append(";")
                        .append(e.getStatus()).append(";")
                        .append(e.getJustification().replace("\n", " ").replace(";", ",")).append(";")
                        .append(e.getObservations() != null ? e.getObservations().replace("\n", " ").replace(";", ",") : "").append("\n");
            }
        } else if ("CLOSINGS".equalsIgnoreCase(type)) {
            List<CashClosing> closings = getClosingsReport(start, end, employeeId);
            csv.append("ID Cierre;Fecha;Hora;Usuario;Total Esperado;Total Contado;Diferencia;Tipo Diferencia;Justificación;Estado\n");
            for (CashClosing cc : closings) {
                csv.append(cc.getId()).append(";")
                        .append(cc.getDate()).append(";")
                        .append(cc.getTime()).append(";")
                        .append(cc.getClosedBy()).append(";")
                        .append(cc.getExpectedMoney()).append(";")
                        .append(cc.getRealMoney()).append(";")
                        .append(cc.getDifference()).append(";")
                        .append(cc.getDifferenceType()).append(";")
                        .append(cc.getJustification() != null ? cc.getJustification().replace("\n", " ").replace(";", ",") : "").append(";")
                        .append(cc.getStatus()).append("\n");
            }
        } else if ("CLIENTS".equalsIgnoreCase(type)) {
            List<Client> clients = getClientsReport(start, end, extraParam != null ? Boolean.valueOf(extraParam) : null, employeeId);
            csv.append("ID Cliente;Nombre Completo;Cédula (DNI);Celular;Dirección;Barrio;Referencia;Notas;Estado;Cobrador Asignado\n");
            for (Client c : clients) {
                String assignedTo = userMap.getOrDefault(c.getAssignedEmployeeId(), "N/A");
                csv.append(c.getId()).append(";")
                        .append(c.getFullName()).append(";")
                        .append(c.getDni()).append(";")
                        .append(c.getPhone()).append(";")
                        .append(c.getAddress()).append(";")
                        .append(c.getNeighborhood()).append(";")
                        .append(c.getPersonalReference() != null ? c.getPersonalReference() : "").append(";")
                        .append(c.getNotes() != null ? c.getNotes().replace("\n", " ").replace(";", ",") : "").append(";")
                        .append(c.isActive() ? "Activo" : "Inactivo").append(";")
                        .append(assignedTo).append("\n");
            }
        } else { // LOANS
            List<Loan> loans = getLoansReport(start, end, extraParam, employeeId);
            csv.append("ID Préstamo;Cliente;DNI Cliente;Tipo Préstamo;Monto Prestado;Tasa Interés (%);Interés;Total a Pagar;Valor Cuota;Total Pagado;Saldo Pendiente;Estado;Fecha Inicio;Fecha Fin Estimada;Creado Por\n");
            for (Loan l : loans) {
                Client c = clientMap.get(l.getClientId());
                String clientName = (c != null) ? c.getFullName() : "N/A";
                String clientDni = (c != null) ? c.getDni() : "N/A";
                String creator = userMap.getOrDefault(l.getCreatedBy(), "N/A");

                csv.append(l.getId()).append(";")
                        .append(clientName).append(";")
                        .append(clientDni).append(";")
                        .append(l.getLoanType()).append(";")
                        .append(l.getAmount()).append(";")
                        .append(l.getInterestRate()).append(";")
                        .append(l.getInterestValue()).append(";")
                        .append(l.getTotalToPay()).append(";")
                        .append(l.getInstallmentValue()).append(";")
                        .append(l.getAmountPaid()).append(";")
                        .append(l.getBalanceOutstanding()).append(";")
                        .append(l.getStatus()).append(";")
                        .append(l.getStartDate()).append(";")
                        .append(l.getEndDateEstimated()).append(";")
                        .append(creator).append("\n");
            }
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }
}
