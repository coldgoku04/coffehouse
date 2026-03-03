package com.coffeehouse.backend.dto;

import com.coffeehouse.backend.model.Cafe;
import com.coffeehouse.backend.model.CafeMenuItem;
import com.coffeehouse.backend.model.CafeTable;
import lombok.Data;

import java.util.List;

@Data
public class CafeDetailsResponse {
    private Cafe cafe;
    private List<CafeMenuItem> menu;
    private List<CafeTable> tables;
    private long waiterCount;
    private long chefCount;
}
