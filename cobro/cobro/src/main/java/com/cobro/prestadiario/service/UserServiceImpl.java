package com.cobro.prestadiario.service;

import com.cobro.prestadiario.model.UserDto;
import com.cobro.prestadiario.model.User;
import com.cobro.prestadiario.exception.BadRequestException;
import com.cobro.prestadiario.exception.ResourceNotFoundException;
import com.cobro.prestadiario.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public User registerUser(UserDto userDto) {
        if (userRepository.existsByUsername(userDto.getUsername())) {
            throw new BadRequestException("Username is already taken");
        }

        User user = new User(
                userDto.getUsername(),
                passwordEncoder.encode(userDto.getPassword()),
                userDto.getFullName(),
                userDto.getRole()
        );
        user.setActive(userDto.isActive());
        return userRepository.save(user);
    }

    @Override
    public User updateUser(String id, UserDto userDto) {
        User user = getUserById(id);

        if (!user.getUsername().equals(userDto.getUsername()) && userRepository.existsByUsername(userDto.getUsername())) {
            throw new BadRequestException("Username is already taken");
        }

        user.setUsername(userDto.getUsername());
        user.setFullName(userDto.getFullName());
        user.setRole(userDto.getRole());
        user.setActive(userDto.isActive());

        if (userDto.getPassword() != null && !userDto.getPassword().trim().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userDto.getPassword()));
        }

        return userRepository.save(user);
    }

    @Override
    public User toggleUserStatus(String id) {
        User user = getUserById(id);
        user.setActive(!user.isActive());
        return userRepository.save(user);
    }

    @Override
    public User getUserById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    @Override
    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
    }

    @Override
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
}
