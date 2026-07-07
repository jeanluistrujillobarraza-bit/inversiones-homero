package com.cobro.prestadiario.controller;

import com.cobro.prestadiario.model.LoginRequest;
import com.cobro.prestadiario.model.JwtResponse;
import com.cobro.prestadiario.model.UserDto;
import com.cobro.prestadiario.model.User;
import com.cobro.prestadiario.repository.UserRepository;
import com.cobro.prestadiario.config.JwtUtils;
import com.cobro.prestadiario.config.UserDetailsImpl;
import com.cobro.prestadiario.service.UserService;
import jakarta.annotation.PostConstruct;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;

    public AuthController(AuthenticationManager authenticationManager, UserService userService,
            UserRepository userRepository, JwtUtils jwtUtils) {
        this.authenticationManager = authenticationManager;
        this.userService = userService;
        this.userRepository = userRepository;
        this.jwtUtils = jwtUtils;
    }

    @PostConstruct
    public void seedInitialAdmin() {
        if (userRepository.count() == 0) {
            UserDto admin = new UserDto();
            admin.setUsername("cristian");
            admin.setPassword("barraza1998");
            admin.setFullName("Administrador del Sistema");
            admin.setRole("ROLE_ADMIN");
            admin.setActive(true);
            userService.registerUser(admin);

            UserDto employee = new UserDto();
            employee.setUsername("empleado");
            employee.setPassword("empleado123");
            employee.setFullName("Empleado Cobrador");
            employee.setRole("ROLE_EMPLOYEE");
            employee.setActive(true);
            userService.registerUser(employee);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        String role = userDetails.getAuthorities().iterator().next().getAuthority();

        return ResponseEntity.ok(new JwtResponse(jwt,
                userDetails.getId(),
                userDetails.getUsername(),
                userDetails.getFullName(),
                role));
    }
}
