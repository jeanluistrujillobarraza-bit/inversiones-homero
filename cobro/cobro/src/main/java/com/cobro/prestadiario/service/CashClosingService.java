package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.CashClosing;
import java.time.LocalDate;
import java.util.List;

public interface CashClosingService {
    CashClosing getClosingPreview(LocalDate date);
    CashClosing performClosing(CashClosing cashClosing, String username);
    List<CashClosing> getClosingHistory();
}
