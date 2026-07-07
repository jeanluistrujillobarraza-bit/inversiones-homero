package com.cobro.prestadiario.controller;

import com.cobro.prestadiario.model.CompanyConfigDto;
import com.cobro.prestadiario.model.CompanyConfig;
import com.cobro.prestadiario.service.CompanyConfigService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/company")
public class CompanyConfigController {

    private final CompanyConfigService configService;

    public CompanyConfigController(CompanyConfigService configService) {
        this.configService = configService;
    }

    @GetMapping
    public ResponseEntity<CompanyConfig> getConfig() {
        return ResponseEntity.ok(configService.getConfig());
    }

    @PutMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<CompanyConfig> updateConfig(@Valid @RequestBody CompanyConfigDto configDto) {
        return ResponseEntity.ok(configService.updateConfig(configDto));
    }
}
