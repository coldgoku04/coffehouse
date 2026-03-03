package com.coffeehouse.backend.repository;

import com.coffeehouse.backend.model.CafeTable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CafeTableRepository extends MongoRepository<CafeTable, String> {
    List<CafeTable> findByCafeId(String cafeId);
}
