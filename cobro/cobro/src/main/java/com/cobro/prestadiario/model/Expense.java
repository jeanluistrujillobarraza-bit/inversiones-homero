package com.cobro.prestadiario.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

@Document(collection = "expenses")
public class Expense {

    @Id
    private String id;
    
    @NotNull(message = "Fecha es obligatoria")
    private LocalDate date;
    
    @NotBlank(message = "Hora es obligatoria")
    private String time;
    
    @NotNull(message = "Valor es obligatorio")
    private Double value;
    
    @NotBlank(message = "Categoría es obligatoria")
    private String category;
    
    @NotBlank(message = "Responsable es obligatorio")
    private String responsible;
    
    @NotBlank(message = "Método de pago es obligatorio")
    private String paymentMethod;
    
    private String observations;
    private String status = "ACTIVO";
    
    @NotBlank(message = "La justificación es obligatoria para registrar un gasto")
    private String justification;
    
    private String evidenceBase64; // Image, PDF, invoice, voucher

    public Expense() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }

    public Double getValue() { return value; }
    public void setValue(Double value) { this.value = value; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getResponsible() { return responsible; }
    public void setResponsible(String responsible) { this.responsible = responsible; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getObservations() { return observations; }
    public void setObservations(String observations) { this.observations = observations; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getJustification() { return justification; }
    public void setJustification(String justification) { this.justification = justification; }

    public String getEvidenceBase64() { return evidenceBase64; }
    public void setEvidenceBase64(String evidenceBase64) { this.evidenceBase64 = evidenceBase64; }
}
