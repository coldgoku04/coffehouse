package com.coffeehouse.backend.repository;

import com.coffeehouse.backend.model.CafeOrder;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CafeOrderRepository extends MongoRepository<CafeOrder, String> {
    List<CafeOrder> findByCafeId(String cafeId);
}
