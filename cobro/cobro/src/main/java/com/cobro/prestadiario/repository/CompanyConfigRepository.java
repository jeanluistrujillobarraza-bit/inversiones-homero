package com.cobro.prestadiario.repository;

import com.cobro.prestadiario.model.CompanyConfig;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CompanyConfigRepository extends MongoRepository<CompanyConfig, String> {
}
