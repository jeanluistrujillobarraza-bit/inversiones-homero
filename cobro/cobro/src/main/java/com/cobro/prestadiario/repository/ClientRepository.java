package com.cobro.prestadiario.repository;

import com.cobro.prestadiario.model.Client;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface ClientRepository extends MongoRepository<Client, String> {
    Optional<Client> findByDni(String dni);
    Boolean existsByDni(String dni);
    List<Client> findByAssignedEmployeeId(String employeeId);
    List<Client> findByFullNameContainingIgnoreCase(String name);
}
