package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.CorrectionRequest;
import com.cobro.prestadiario.model.CorrectionRequestDto;
import com.cobro.prestadiario.model.Payment;
import com.cobro.prestadiario.model.PaymentDto;
import com.cobro.prestadiario.exception.BadRequestException;
import com.cobro.prestadiario.exception.ResourceNotFoundException;
import com.cobro.prestadiario.repository.CorrectionRequestRepository;
import com.cobro.prestadiario.repository.PaymentRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CorrectionRequestServiceImpl implements CorrectionRequestService {

    private final CorrectionRequestRepository repository;
    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;

    public CorrectionRequestServiceImpl(CorrectionRequestRepository repository, PaymentRepository paymentRepository, PaymentService paymentService) {
        this.repository = repository;
        this.paymentRepository = paymentRepository;
        this.paymentService = paymentService;
    }

    @Override
    public CorrectionRequest createRequest(CorrectionRequestDto dto, String employeeId, String employeeName) {
        Payment payment = paymentRepository.findById(dto.getPaymentId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + dto.getPaymentId()));

        CorrectionRequest req = new CorrectionRequest();
        req.setPaymentId(dto.getPaymentId());
        req.setEmployeeId(employeeId);
        req.setEmployeeName(employeeName);
        req.setOriginalAmount(payment.getAmount());
        req.setRequestedAmount(dto.getRequestedAmount());
        req.setReason(dto.getReason());
        req.setStatus("PENDIENTE");

        return repository.save(req);
    }

    @Override
    public List<CorrectionRequest> getAllRequests() {
        return repository.findAll();
    }

    @Override
    public List<CorrectionRequest> getRequestsByEmployee(String employeeId) {
        return repository.findByEmployeeId(employeeId);
    }

    @Override
    public CorrectionRequest approveRequest(String requestId) {
        CorrectionRequest req = repository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found with id: " + requestId));

        if (!"PENDIENTE".equals(req.getStatus())) {
            throw new BadRequestException("Request is already processed: " + req.getStatus());
        }

        Payment payment = paymentRepository.findById(req.getPaymentId())
                .orElseThrow(() -> new ResourceNotFoundException("Associated payment not found: " + req.getPaymentId()));

        PaymentDto payDto = new PaymentDto();
        payDto.setLoanId(payment.getLoanId());
        payDto.setAmount(req.getRequestedAmount());
        payDto.setPaymentMethod(payment.getPaymentMethod());
        payDto.setNotes(payment.getNotes() != null ? payment.getNotes() : "");

        // Update the payment as Admin (which handles recalculation of loan)
        paymentService.updatePayment(payment.getId(), payDto, req.getEmployeeId());

        req.setStatus("APROBADO");
        return repository.save(req);
    }

    @Override
    public CorrectionRequest rejectRequest(String requestId) {
        CorrectionRequest req = repository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found with id: " + requestId));

        if (!"PENDIENTE".equals(req.getStatus())) {
            throw new BadRequestException("Request is already processed: " + req.getStatus());
        }

        req.setStatus("RECHAZADO");
        return repository.save(req);
    }
}
