package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.CompanyConfig;
import com.cobro.prestadiario.model.CompanyConfigDto;

public interface CompanyConfigService {
    CompanyConfig getConfig();
    CompanyConfig updateConfig(CompanyConfigDto configDto);
}
