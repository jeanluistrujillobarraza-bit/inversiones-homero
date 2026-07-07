package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.User;
import com.cobro.prestadiario.model.UserDto;

import java.util.List;

public interface UserService {
    User registerUser(UserDto userDto);
    User updateUser(String id, UserDto userDto);
    User toggleUserStatus(String id);
    User getUserById(String id);
    User getUserByUsername(String username);
    List<User> getAllUsers();
}
