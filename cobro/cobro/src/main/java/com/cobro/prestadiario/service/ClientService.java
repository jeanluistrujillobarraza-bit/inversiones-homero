package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.Client;
import com.cobro.prestadiario.model.ClientDto;

import java.util.List;

public interface ClientService {
    Client createClient(ClientDto clientDto, String employeeId);
    Client updateClient(String id, ClientDto clientDto);
    void deleteClient(String id);
    Client getClientById(String id);
    List<Client> getAllClients(String currentUserId, String role);
    List<Client> searchClients(String query, String currentUserId, String role);
}
