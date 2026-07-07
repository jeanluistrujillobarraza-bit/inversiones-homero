package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.Expense;
import java.util.List;

public interface ExpenseService {
    Expense createExpense(Expense expense, String username);
    Expense updateExpense(String id, Expense expense, String username);
    void deleteExpense(String id, String username);
    Expense getExpenseById(String id);
    List<Expense> getAllExpenses();
}
