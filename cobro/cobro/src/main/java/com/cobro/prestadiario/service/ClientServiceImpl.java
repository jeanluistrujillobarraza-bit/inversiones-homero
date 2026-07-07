package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.ClientDto;
import com.cobro.prestadiario.model.Client;
import com.cobro.prestadiario.exception.BadRequestException;
import com.cobro.prestadiario.exception.ResourceNotFoundException;
import com.cobro.prestadiario.repository.ClientRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ClientServiceImpl implements ClientService {

    private final ClientRepository clientRepository;

    public ClientServiceImpl(ClientRepository clientRepository) {
        this.clientRepository = clientRepository;
    }

    @Override
    public Client createClient(ClientDto clientDto, String employeeId) {
        if (clientRepository.existsByDni(clientDto.getDni())) {
            throw new BadRequestException("Client with DNI/Cédula " + clientDto.getDni() + " already exists.");
        }

        Client client = new Client();
        client.setDni(clientDto.getDni());
        client.setFullName(clientDto.getFullName());
        client.setPhotoBase64(clientDto.getPhotoBase64());
        client.setAddress(clientDto.getAddress());
        client.setNeighborhood(clientDto.getNeighborhood());
        client.setPhone(clientDto.getPhone());
        client.setPersonalReference(clientDto.getPersonalReference());
        client.setNotes(clientDto.getNotes());
        if (clientDto.getAssignedEmployeeId() != null && !clientDto.getAssignedEmployeeId().isEmpty()) {
            client.setAssignedEmployeeId(clientDto.getAssignedEmployeeId());
        } else {
            client.setAssignedEmployeeId(employeeId);
        }
        client.setActive(clientDto.isActive());

        return clientRepository.save(client);
    }

    @Override
    public Client updateClient(String id, ClientDto clientDto) {
        Client client = getClientById(id);

        if (!client.getDni().equals(clientDto.getDni()) && clientRepository.existsByDni(clientDto.getDni())) {
            throw new BadRequestException("Client with DNI/Cédula " + clientDto.getDni() + " already exists.");
        }

        client.setDni(clientDto.getDni());
        client.setFullName(clientDto.getFullName());
        if (clientDto.getPhotoBase64() != null && !clientDto.getPhotoBase64().isEmpty()) {
            client.setPhotoBase64(clientDto.getPhotoBase64());
        }
        client.setAddress(clientDto.getAddress());
        client.setNeighborhood(clientDto.getNeighborhood());
        client.setPhone(clientDto.getPhone());
        client.setPersonalReference(clientDto.getPersonalReference());
        client.setNotes(clientDto.getNotes());
        if (clientDto.getAssignedEmployeeId() != null) {
            client.setAssignedEmployeeId(clientDto.getAssignedEmployeeId());
        }
        client.setActive(clientDto.isActive());

        return clientRepository.save(client);
    }

    @Override
    public void deleteClient(String id) {
        Client client = getClientById(id);
        clientRepository.delete(client);
    }

    @Override
    public Client getClientById(String id) {
        return clientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found with id: " + id));
    }

    @Override
    public List<Client> getAllClients(String currentUserId, String role) {
        if ("ROLE_EMPLOYEE".equals(role)) {
            return clientRepository.findByAssignedEmployeeId(currentUserId);
        }
        return clientRepository.findAll();
    }

    @Override
    public List<Client> searchClients(String query, String currentUserId, String role) {
        List<Client> results = clientRepository.findByFullNameContainingIgnoreCase(query);
        if ("ROLE_EMPLOYEE".equals(role)) {
            return results.stream()
                    .filter(c -> currentUserId.equals(c.getAssignedEmployeeId()))
                    .collect(Collectors.toList());
        }
        return results;
    }
}
