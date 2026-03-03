package com.coffeehouse.backend.repository;

import com.coffeehouse.backend.model.CafeMenuItem;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CafeMenuItemRepository extends MongoRepository<CafeMenuItem, String> {
    List<CafeMenuItem> findByCafeId(String cafeId);
}
