package com.cobro.prestadiario.controller;

import com.cobro.prestadiario.model.DashboardDto;
import com.cobro.prestadiario.config.UserDetailsImpl;
import com.cobro.prestadiario.service.DashboardService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public ResponseEntity<DashboardDto> getStats(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        String role = userDetails.getAuthorities().iterator().next().getAuthority();
        return ResponseEntity.ok(dashboardService.getDashboardStats(userDetails.getId(), role));
    }

    @PostMapping("/reset")
    public ResponseEntity<?> resetDashboard(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        String role = userDetails.getAuthorities().iterator().next().getAuthority();
        if (!"ROLE_ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Acceso denegado: solo los administradores pueden reiniciar el dashboard."));
        }
        dashboardService.resetDashboard(userDetails.getUsername());
        return ResponseEntity.ok(Map.of(
            "message", "Dashboard y cartera reiniciados exitosamente. Todos los valores han quedado en 0 para el nuevo ciclo."
        ));
    }
}
