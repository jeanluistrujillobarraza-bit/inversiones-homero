package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.CorrectionRequest;
import com.cobro.prestadiario.model.CorrectionRequestDto;

import java.util.List;

public interface CorrectionRequestService {
    CorrectionRequest createRequest(CorrectionRequestDto dto, String employeeId, String employeeName);
    List<CorrectionRequest> getAllRequests();
    List<CorrectionRequest> getRequestsByEmployee(String employeeId);
    CorrectionRequest approveRequest(String requestId);
    CorrectionRequest rejectRequest(String requestId);
}
