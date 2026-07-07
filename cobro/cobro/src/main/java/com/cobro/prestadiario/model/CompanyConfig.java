package com.cobro.prestadiario.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "company_config")
public class CompanyConfig {

    @Id
    private String id = "singleton_config";
    private String companyName = "INVERSIONES HOMERO";
    private String nit = "900.123.456-7";
    private String phone = "+57 300 123 4567";
    private String address = "Calle 123 #45-67, Bogotá";
    private String logoBase64 = "";
    private Double defaultInterestRate = 10.0;

    public CompanyConfig() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public String getNit() { return nit; }
    public void setNit(String nit) { this.nit = nit; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getLogoBase64() { return logoBase64; }
    public void setLogoBase64(String logoBase64) { this.logoBase64 = logoBase64; }

    public Double getDefaultInterestRate() { return defaultInterestRate; }
    public void setDefaultInterestRate(Double defaultInterestRate) { this.defaultInterestRate = defaultInterestRate; }
}
