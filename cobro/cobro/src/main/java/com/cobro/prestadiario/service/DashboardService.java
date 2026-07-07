package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.DashboardDto;

public interface DashboardService {
    DashboardDto getDashboardStats(String currentUserId, String role);
}
