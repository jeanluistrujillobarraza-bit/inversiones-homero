package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.CompanyConfigDto;
import com.cobro.prestadiario.model.CompanyConfig;
import com.cobro.prestadiario.repository.CompanyConfigRepository;
import org.springframework.stereotype.Service;

@Service
public class CompanyConfigServiceImpl implements CompanyConfigService {

    private final CompanyConfigRepository configRepository;

    public CompanyConfigServiceImpl(CompanyConfigRepository configRepository) {
        this.configRepository = configRepository;
    }

    @Override
    public CompanyConfig getConfig() {
        return configRepository.findById("singleton_config")
                .orElseGet(() -> configRepository.save(new CompanyConfig()));
    }

    @Override
    public CompanyConfig updateConfig(CompanyConfigDto configDto) {
        CompanyConfig config = getConfig();
        config.setCompanyName(configDto.getCompanyName());
        config.setNit(configDto.getNit());
        config.setPhone(configDto.getPhone());
        config.setAddress(configDto.getAddress());
        if (configDto.getLogoBase64() != null && !configDto.getLogoBase64().isEmpty()) {
            config.setLogoBase64(configDto.getLogoBase64());
        }
        config.setDefaultInterestRate(configDto.getDefaultInterestRate());
        return configRepository.save(config);
    }
}
