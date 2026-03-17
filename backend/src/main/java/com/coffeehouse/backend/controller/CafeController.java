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
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/cafes")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class CafeController {

    private static final Set<String> TERMINAL_ORDER_STATUSES = Set.of("COMPLETED", "SERVED", "CANCELLED", "REJECTED");
    private static final Set<String> ALLOWED_ORDER_STATUSES = Set.of("PLACED", "ACCEPTED", "COOKING", "READY", "SERVING", "SERVED", "COMPLETED", "CANCELLED", "REJECTED");

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

        List<CafeTable> tables = cafeTableRepository.findByCafeId(cafeId);
        applyLiveTableAvailability(cafeId, tables, LocalDateTime.now());

        CafeDetailsResponse response = new CafeDetailsResponse();
        response.setCafe(cafeOpt.get());
        response.setMenu(cafeMenuItemRepository.findByCafeId(cafeId));
        response.setTables(tables);
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
        if (isBlank(request.getName()) || request.getPrice() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Menu item name and price are required."));
        }

        request.setId(null);
        request.setCafeId(cafeId);
        request.setName(request.getName().trim());
        request.setCategory(request.getCategory() == null ? null : request.getCategory().trim());
        request.setCreatedAt(LocalDateTime.now());
        request.setUpdatedAt(LocalDateTime.now());
        if (request.getAvailable() == null) {
            request.setAvailable(true);
        }
        return ResponseEntity.ok(cafeMenuItemRepository.save(request));
    }

    @PutMapping("/{cafeId}/menu/{menuItemId}")
    public ResponseEntity<?> updateMenuItem(
            @PathVariable String cafeId,
            @PathVariable String menuItemId,
            @RequestBody CafeMenuItem request
    ) {
        Optional<CafeMenuItem> itemOpt = cafeMenuItemRepository.findById(menuItemId);
        if (itemOpt.isEmpty() || !cafeId.equals(itemOpt.get().getCafeId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Menu item not found for this cafe."));
        }
        if (isBlank(request.getName()) || request.getPrice() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Menu item name and price are required."));
        }

        CafeMenuItem item = itemOpt.get();
        item.setName(request.getName().trim());
        item.setDescription(request.getDescription());
        item.setCategory(request.getCategory() == null ? null : request.getCategory().trim());
        item.setPrice(request.getPrice());
        item.setImageUrl(request.getImageUrl());
        if (request.getAvailable() != null) {
            item.setAvailable(request.getAvailable());
        }
        item.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(cafeMenuItemRepository.save(item));
    }

    @DeleteMapping("/{cafeId}/menu/{menuItemId}")
    public ResponseEntity<?> deleteMenuItem(@PathVariable String cafeId, @PathVariable String menuItemId) {
        Optional<CafeMenuItem> itemOpt = cafeMenuItemRepository.findById(menuItemId);
        if (itemOpt.isEmpty() || !cafeId.equals(itemOpt.get().getCafeId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Menu item not found for this cafe."));
        }
        cafeMenuItemRepository.deleteById(menuItemId);
        return ResponseEntity.ok(Map.of("message", "Menu item deleted."));
    }

    @GetMapping("/{cafeId}/tables")
    public List<CafeTable> getCafeTables(@PathVariable String cafeId) {
        List<CafeTable> tables = cafeTableRepository.findByCafeId(cafeId);
        applyLiveTableAvailability(cafeId, tables, LocalDateTime.now());
        return tables;
    }

    @PostMapping("/{cafeId}/tables")
    public ResponseEntity<?> addTable(@PathVariable String cafeId, @RequestBody CafeTable request) {
        Optional<Cafe> cafeOpt = cafeRepository.findById(cafeId);
        if (cafeOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cafe not found."));
        }
        if (isBlank(request.getTableNumber()) || request.getCapacity() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Table number and capacity are required."));
        }
        if (isBlank(request.getCategory())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Table category is required."));
        }

        request.setId(null);
        request.setCafeId(cafeId);
        request.setTableNumber(request.getTableNumber().trim());
        request.setCategory(request.getCategory().trim());
        request.setCreatedAt(LocalDateTime.now());
        request.setUpdatedAt(LocalDateTime.now());
        if (request.getAvailable() == null) {
            request.setAvailable(true);
        }
        return ResponseEntity.ok(cafeTableRepository.save(request));
    }

    @PutMapping("/{cafeId}/tables/{tableId}")
    public ResponseEntity<?> updateTable(
            @PathVariable String cafeId,
            @PathVariable String tableId,
            @RequestBody CafeTable request
    ) {
        Optional<CafeTable> tableOpt = cafeTableRepository.findById(tableId);
        if (tableOpt.isEmpty() || !cafeId.equals(tableOpt.get().getCafeId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Table not found for this cafe."));
        }
        if (isBlank(request.getTableNumber()) || request.getCapacity() == null || isBlank(request.getCategory())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Table number, category and capacity are required."));
        }

        CafeTable table = tableOpt.get();
        table.setTableNumber(request.getTableNumber().trim());
        table.setCategory(request.getCategory().trim());
        table.setCapacity(request.getCapacity());
        if (request.getAvailable() != null) {
            table.setAvailable(request.getAvailable());
        }
        table.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(cafeTableRepository.save(table));
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
        if (isBlank(request.getPhone()) || isBlank(request.getDateOfBirth())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Phone and date of birth are required."));
        }
        if (isBlank(request.getGovIdType())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Government ID type is required."));
        }
        if (isBlank(request.getAddress()) || isBlank(request.getCity()) || isBlank(request.getState())
                || isBlank(request.getPostalCode()) || isBlank(request.getCountry())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Complete address details are required."));
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
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setEducation(request.getEducation());
        employee.setSchoolName(request.getSchoolName());
        employee.setCollegeName(request.getCollegeName());
        employee.setDegreeDetails(request.getDegreeDetails());
        employee.setCourseStream(request.getCourseStream());
        employee.setYearOfPassing(request.getYearOfPassing());
        employee.setRollNumber(request.getRollNumber());
        employee.setGovIdType(request.getGovIdType());
        employee.setAddress(request.getAddress());
        employee.setCity(request.getCity());
        employee.setState(request.getState());
        employee.setPostalCode(request.getPostalCode());
        employee.setCountry(request.getCountry());
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
        List<CafeOrder> orders = cafeOrderRepository.findByCafeId(cafeId);
        orders.sort(Comparator.comparing(CafeOrder::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed());
        return orders;
    }

    @GetMapping("/orders/customer/{customerId}")
    public List<CafeOrder> getCustomerOrders(@PathVariable String customerId) {
        List<CafeOrder> orders = cafeOrderRepository.findByCustomerId(customerId);
        orders.sort(Comparator.comparing(CafeOrder::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed());
        return orders;
    }

    @PostMapping("/{cafeId}/orders")
    public ResponseEntity<?> createOrder(@PathVariable String cafeId, @RequestBody CreateCafeOrderRequest request) {
        Optional<Cafe> cafeOpt = cafeRepository.findById(cafeId);
        if (cafeOpt.isEmpty() || !Boolean.TRUE.equals(cafeOpt.get().getActive())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cafe not found."));
        }
        if (isBlank(request.getTableId()) || isBlank(request.getTableNumber())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Table selection is required."));
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "At least one menu item is required."));
        }

        Optional<CafeTable> tableOpt = cafeTableRepository.findById(request.getTableId());
        if (tableOpt.isEmpty() || !cafeId.equals(tableOpt.get().getCafeId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Selected table does not belong to this cafe."));
        }

        LocalDateTime bookingStart = parseDateTime(request.getBookingDateTime());
        if (bookingStart == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Booking date and time are required."));
        }
        int duration = request.getDurationMinutes() == null || request.getDurationMinutes() <= 0 ? 60 : request.getDurationMinutes();
        LocalDateTime bookingEnd = bookingStart.plusMinutes(duration);

        List<CafeOrder> sameTableOrders = cafeOrderRepository.findByCafeIdAndTableId(cafeId, request.getTableId());
        for (CafeOrder existing : sameTableOrders) {
            if (isTerminalStatus(existing.getStatus())) {
                continue;
            }
            LocalDateTime existingStart = existing.getBookingDateTime() == null ? existing.getCreatedAt() : existing.getBookingDateTime();
            LocalDateTime existingEnd = existingStart == null
                    ? null
                    : existingStart.plusMinutes(existing.getDurationMinutes() == null || existing.getDurationMinutes() <= 0 ? 60 : existing.getDurationMinutes());
            if (existingStart == null || existingEnd == null || intervalsOverlap(existingStart, existingEnd, bookingStart, bookingEnd)) {
                return ResponseEntity.badRequest().body(Map.of("message", "This table is already booked for the selected time."));
            }
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
        order.setCustomerId(request.getCustomerId());
        order.setCustomerName(request.getCustomerName());
        order.setBookingDateTime(bookingStart);
        order.setDurationMinutes(duration);
        order.setSpecialRequests(request.getSpecialRequests());
        order.setItems(request.getItems());
        order.setTotalAmount(total);
        order.setStatus("PLACED");
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());

        CafeOrder saved = cafeOrderRepository.save(order);
        syncTableAvailabilityForId(cafeId, request.getTableId(), LocalDateTime.now());
        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/{cafeId}/orders/{orderId}/status")
    public ResponseEntity<?> updateOrderStatus(
            @PathVariable String cafeId,
            @PathVariable String orderId,
            @RequestBody Map<String, String> request
    ) {
        String status = request.get("status") == null ? "" : request.get("status").trim().toUpperCase();
        if (!ALLOWED_ORDER_STATUSES.contains(status)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid status."));
        }

        Optional<CafeOrder> orderOpt = cafeOrderRepository.findById(orderId);
        if (orderOpt.isEmpty() || !cafeId.equals(orderOpt.get().getCafeId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Order not found for this cafe."));
        }

        CafeOrder order = orderOpt.get();
        order.setStatus(status);
        order.setUpdatedAt(LocalDateTime.now());
        CafeOrder saved = cafeOrderRepository.save(order);
        syncTableAvailabilityForId(cafeId, order.getTableId(), LocalDateTime.now());
        return ResponseEntity.ok(saved);
    }

    private void applyLiveTableAvailability(String cafeId, List<CafeTable> tables, LocalDateTime now) {
        if (tables == null || tables.isEmpty()) {
            return;
        }
        List<CafeOrder> cafeOrders = cafeOrderRepository.findByCafeId(cafeId);
        for (CafeTable table : tables) {
            boolean blocked = cafeOrders.stream().anyMatch(order -> table.getId() != null
                    && table.getId().equals(order.getTableId())
                    && isOrderBlockingAtNow(order, now));
            table.setAvailable(!blocked);
        }
    }

    private void syncTableAvailabilityForId(String cafeId, String tableId, LocalDateTime now) {
        if (isBlank(tableId)) {
            return;
        }
        Optional<CafeTable> tableOpt = cafeTableRepository.findById(tableId);
        if (tableOpt.isEmpty() || !cafeId.equals(tableOpt.get().getCafeId())) {
            return;
        }
        CafeTable table = tableOpt.get();
        List<CafeOrder> tableOrders = cafeOrderRepository.findByCafeIdAndTableId(cafeId, tableId);
        boolean blocked = tableOrders.stream().anyMatch(order -> isOrderBlockingAtNow(order, now));
        table.setAvailable(!blocked);
        table.setUpdatedAt(LocalDateTime.now());
        cafeTableRepository.save(table);
    }

    private boolean isOrderBlockingAtNow(CafeOrder order, LocalDateTime now) {
        if (isTerminalStatus(order.getStatus())) {
            return false;
        }
        LocalDateTime start = order.getBookingDateTime() == null ? order.getCreatedAt() : order.getBookingDateTime();
        if (start == null) {
            return false;
        }
        int duration = order.getDurationMinutes() == null || order.getDurationMinutes() <= 0 ? 60 : order.getDurationMinutes();
        LocalDateTime end = start.plusMinutes(duration);
        return now.isBefore(end);
    }

    private boolean intervalsOverlap(LocalDateTime aStart, LocalDateTime aEnd, LocalDateTime bStart, LocalDateTime bEnd) {
        return aStart.isBefore(bEnd) && bStart.isBefore(aEnd);
    }

    private LocalDateTime parseDateTime(String dateTime) {
        if (isBlank(dateTime)) {
            return null;
        }
        try {
            return LocalDateTime.parse(dateTime.trim());
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private boolean isTerminalStatus(String status) {
        return status != null && TERMINAL_ORDER_STATUSES.contains(status.trim().toUpperCase());
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
