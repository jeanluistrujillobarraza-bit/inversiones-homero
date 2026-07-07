package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.Expense;
import com.cobro.prestadiario.model.AuditLog;
import com.cobro.prestadiario.repository.ExpenseRepository;
import com.cobro.prestadiario.repository.AuditLogRepository;
import com.cobro.prestadiario.exception.BadRequestException;
import com.cobro.prestadiario.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ExpenseServiceImpl implements ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final AuditLogRepository auditLogRepository;

    public ExpenseServiceImpl(ExpenseRepository expenseRepository, AuditLogRepository auditLogRepository) {
        this.expenseRepository = expenseRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    public Expense createExpense(Expense expense, String username) {
        if (expense.getJustification() == null || expense.getJustification().trim().isEmpty()) {
            throw new BadRequestException("No se permite guardar un gasto sin escribir una justificación obligatoria.");
        }
        Expense saved = expenseRepository.save(expense);
        
        auditLogRepository.save(new AuditLog(
            username, 
            "REGISTRO_GASTO", 
            "Se registró un gasto por valor de " + expense.getValue() + " en la categoría " + expense.getCategory() + ". Justificación: " + expense.getJustification()
        ));
        
        return saved;
    }

    @Override
    public Expense updateExpense(String id, Expense expenseDetails, String username) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gasto no encontrado con id: " + id));

        if (expenseDetails.getJustification() == null || expenseDetails.getJustification().trim().isEmpty()) {
            throw new BadRequestException("No se permite guardar un gasto sin escribir una justificación obligatoria.");
        }

        expense.setDate(expenseDetails.getDate());
        expense.setTime(expenseDetails.getTime());
        expense.setValue(expenseDetails.getValue());
        expense.setCategory(expenseDetails.getCategory());
        expense.setResponsible(expenseDetails.getResponsible());
        expense.setPaymentMethod(expenseDetails.getPaymentMethod());
        expense.setObservations(expenseDetails.getObservations());
        expense.setStatus(expenseDetails.getStatus());
        expense.setJustification(expenseDetails.getJustification());
        if (expenseDetails.getEvidenceBase64() != null) {
            expense.setEvidenceBase64(expenseDetails.getEvidenceBase64());
        }

        Expense updated = expenseRepository.save(expense);

        auditLogRepository.save(new AuditLog(
            username, 
            "MODIFICACION_GASTO", 
            "Se modificó el gasto ID " + id + ". Nuevo valor: " + updated.getValue() + ", Categoría: " + updated.getCategory()
        ));

        return updated;
    }

    @Override
    public void deleteExpense(String id, String username) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gasto no encontrado con id: " + id));
        expenseRepository.delete(expense);

        auditLogRepository.save(new AuditLog(
            username, 
            "ELIMINACION_GASTO", 
            "Se eliminó el gasto ID " + id + " de valor " + expense.getValue() + " en la categoría " + expense.getCategory()
        ));
    }

    @Override
    public Expense getExpenseById(String id) {
        return expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gasto no encontrado con id: " + id));
    }

    @Override
    public List<Expense> getAllExpenses() {
        return expenseRepository.findAll();
    }
}
