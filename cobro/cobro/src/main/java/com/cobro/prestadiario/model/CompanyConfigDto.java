package com.cobro.prestadiario.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CompanyConfigDto {
    @NotBlank(message = "Company name is required")
    private String companyName;

    @NotBlank(message = "NIT is required")
    private String nit;

    @NotBlank(message = "Phone number is required")
    private String phone;

    @NotBlank(message = "Address is required")
    private String address;

    private String logoBase64;

    @NotNull(message = "Default interest rate is required")
    private Double defaultInterestRate;

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
