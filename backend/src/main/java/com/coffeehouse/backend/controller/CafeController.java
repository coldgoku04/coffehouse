package com.coffeehouse.backend.controller;

import com.coffeehouse.backend.dto.CafeDetailsResponse;
import com.coffeehouse.backend.dto.CreateCafeOrderRequest;
import com.coffeehouse.backend.dto.OwnerEmployeeRegisterRequest;
import com.coffeehouse.backend.model.Cafe;
import com.coffeehouse.backend.model.CafeMenuItem;
import com.coffeehouse.backend.model.CafeOrder;
import com.coffeehouse.backend.model.CafeOrderItem;
import com.coffeehouse.backend.model.CafeTable;
import com.coffeehouse.backend.model.User;
import com.coffeehouse.backend.repository.CafeMenuItemRepository;
import com.coffeehouse.backend.repository.CafeOrderRepository;
import com.coffeehouse.backend.repository.CafeRepository;
import com.coffeehouse.backend.repository.CafeTableRepository;
import com.coffeehouse.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/cafes")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class CafeController {

    @Autowired
    private CafeRepository cafeRepository;

    @Autowired
    private CafeMenuItemRepository cafeMenuItemRepository;

    @Autowired
    private CafeTableRepository cafeTableRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CafeOrderRepository cafeOrderRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping
    public List<Cafe> getAllCafes() {
        return cafeRepository.findByActiveTrue();
    }

    @GetMapping("/owner/{ownerId}")
    public ResponseEntity<?> getCafeByOwner(@PathVariable String ownerId) {
        List<Cafe> cafes = cafeRepository.findByOwnerId(ownerId);
        if (cafes.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(cafes.get(0));
    }

    @GetMapping("/{cafeId}")
    public ResponseEntity<?> getCafeDetails(@PathVariable String cafeId) {
        Optional<Cafe> cafeOpt = cafeRepository.findById(cafeId);
        if (cafeOpt.isEmpty() || !Boolean.TRUE.equals(cafeOpt.get().getActive())) {
            return ResponseEntity.notFound().build();
        }

        CafeDetailsResponse response = new CafeDetailsResponse();
        response.setCafe(cafeOpt.get());
        response.setMenu(cafeMenuItemRepository.findByCafeId(cafeId));
        response.setTables(cafeTableRepository.findByCafeId(cafeId));
        response.setWaiterCount(userRepository.countByCafeIdAndRole(cafeId, "WAITER"));
        response.setChefCount(userRepository.countByCafeIdAndRole(cafeId, "CHEF"));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/owner/{ownerId}")
    public ResponseEntity<?> createCafe(@PathVariable String ownerId, @RequestBody Cafe request) {
        Optional<User> ownerOpt = userRepository.findById(ownerId);
        if (ownerOpt.isEmpty() || !"CAFE_OWNER".equals(ownerOpt.get().getRole())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Valid cafe owner is required."));
        }
        User owner = ownerOpt.get();
        if (!"APPROVED".equalsIgnoreCase(owner.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Owner must be approved."));
        }
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cafe name is required."));
        }

        request.setId(null);
        request.setOwnerId(ownerId);
        request.setActive(true);
        request.setCreatedAt(LocalDateTime.now());
        request.setUpdatedAt(LocalDateTime.now());

        Cafe savedCafe = cafeRepository.save(request);
        owner.setCafeId(savedCafe.getId());
        owner.setUpdatedAt(LocalDateTime.now());
        userRepository.save(owner);

        return ResponseEntity.ok(savedCafe);
    }

    @GetMapping("/{cafeId}/menu")
    public List<CafeMenuItem> getCafeMenu(@PathVariable String cafeId) {
        return cafeMenuItemRepository.findByCafeId(cafeId);
    }

    @PostMapping("/{cafeId}/menu")
    public ResponseEntity<?> addMenuItem(@PathVariable String cafeId, @RequestBody CafeMenuItem request) {
        Optional<Cafe> cafeOpt = cafeRepository.findById(cafeId);
        if (cafeOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cafe not found."));
        }
        if (request.getName() == null || request.getName().trim().isEmpty() || request.getPrice() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Menu item name and price are required."));
        }

        request.setId(null);
        request.setCafeId(cafeId);
        request.setCreatedAt(LocalDateTime.now());
        request.setUpdatedAt(LocalDateTime.now());
        if (request.getAvailable() == null) {
            request.setAvailable(true);
        }
        return ResponseEntity.ok(cafeMenuItemRepository.save(request));
    }

    @GetMapping("/{cafeId}/tables")
    public List<CafeTable> getCafeTables(@PathVariable String cafeId) {
        return cafeTableRepository.findByCafeId(cafeId);
    }

    @PostMapping("/{cafeId}/tables")
    public ResponseEntity<?> addTable(@PathVariable String cafeId, @RequestBody CafeTable request) {
        Optional<Cafe> cafeOpt = cafeRepository.findById(cafeId);
        if (cafeOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cafe not found."));
        }
        if (request.getTableNumber() == null || request.getTableNumber().trim().isEmpty() || request.getCapacity() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Table number and capacity are required."));
        }
        if (isBlank(request.getCategory())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Table category is required."));
        }

        request.setId(null);
        request.setCafeId(cafeId);
        request.setCategory(request.getCategory().trim());
        request.setCreatedAt(LocalDateTime.now());
        request.setUpdatedAt(LocalDateTime.now());
        if (request.getAvailable() == null) {
            request.setAvailable(true);
        }
        return ResponseEntity.ok(cafeTableRepository.save(request));
    }

    @PostMapping("/{cafeId}/owner/{ownerId}/employees")
    public ResponseEntity<?> registerEmployeeByOwner(
            @PathVariable String cafeId,
            @PathVariable String ownerId,
            @RequestBody OwnerEmployeeRegisterRequest request
    ) {
        Optional<Cafe> cafeOpt = cafeRepository.findById(cafeId);
        if (cafeOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cafe not found."));
        }

        Optional<User> ownerOpt = userRepository.findById(ownerId);
        if (ownerOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Owner not found."));
        }

        User owner = ownerOpt.get();
        if (!"CAFE_OWNER".equalsIgnoreCase(owner.getRole()) || !cafeId.equals(owner.getCafeId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Owner does not belong to this cafe."));
        }

        String role = request.getRole() == null ? "" : request.getRole().trim().toUpperCase();
        if (!"CHEF".equals(role) && !"WAITER".equals(role)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Role must be CHEF or WAITER."));
        }
        if (isBlank(request.getFirstName()) || isBlank(request.getLastName()) || isBlank(request.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("message", "First name, last name and email are required."));
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email already registered."));
        }

        String baseUsername = request.getFirstName().toLowerCase() + "." + request.getLastName().toLowerCase();
        String username = baseUsername;
        int counter = 1;
        while (userRepository.existsByUsername(username)) {
            username = baseUsername + counter++;
        }

        String tempPassword = UUID.randomUUID().toString().substring(0, 10);

        User employee = new User();
        employee.setUsername(username);
        employee.setEmail(request.getEmail());
        employee.setFirstName(request.getFirstName());
        employee.setLastName(request.getLastName());
        employee.setPhone(request.getPhone());
        employee.setRole(role);
        employee.setCafeId(cafeId);
        employee.setCreatedByOwnerId(ownerId);
        employee.setPassword(passwordEncoder.encode(tempPassword));
        employee.setStatus("APPROVED");
        employee.setIsTemporaryPassword(true);
        employee.setMustChangePassword(true);
        employee.setCreatedAt(LocalDateTime.now());
        employee.setUpdatedAt(LocalDateTime.now());
        userRepository.save(employee);

        return ResponseEntity.ok(Map.of(
                "message", "Employee created and approved successfully.",
                "username", username,
                "temporaryPassword", tempPassword
        ));
    }

    @GetMapping("/{cafeId}/orders")
    public List<CafeOrder> getCafeOrders(@PathVariable String cafeId) {
        return cafeOrderRepository.findByCafeId(cafeId);
    }

    @PostMapping("/{cafeId}/orders")
    public ResponseEntity<?> createOrder(@PathVariable String cafeId, @RequestBody CreateCafeOrderRequest request) {
        if (isBlank(request.getTableId()) || isBlank(request.getTableNumber())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Table selection is required."));
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "At least one order item is required."));
        }

        double total = 0.0;
        for (CafeOrderItem item : request.getItems()) {
            if (item.getQuantity() == null || item.getQuantity() <= 0 || item.getPrice() == null || item.getPrice() < 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "Order items contain invalid quantity or price."));
            }
            total += item.getPrice() * item.getQuantity();
        }

        CafeOrder order = new CafeOrder();
        order.setCafeId(cafeId);
        order.setTableId(request.getTableId());
        order.setTableNumber(request.getTableNumber());
        order.setItems(request.getItems());
        order.setTotalAmount(total);
        order.setStatus("PLACED");
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());

        return ResponseEntity.ok(cafeOrderRepository.save(order));
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
