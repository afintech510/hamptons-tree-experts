-- Phase 05: populate plant catalog pricing (F-003)
-- Updates the plants service_type pricing_model with a catalog of
-- plant types, sizes, and per-item prices. Placeholder rates (R-07).
-- Rollback: re-run seed with empty catalog.

UPDATE service_types
SET pricing_model = '{
    "unit": "plant_type_size_qty",
    "tier_multipliers": {"tomorrow": 2.00, "2_5_day": 1.25, "6_14_day": 1.00},
    "catalog": {
        "native_shrub": {
            "name": "Native Shrub",
            "sizes": {"small": 4500, "medium": 7500, "large": 12000}
        },
        "ornamental_grass": {
            "name": "Ornamental Grass",
            "sizes": {"small": 3500, "medium": 5500, "large": 8500}
        },
        "perennial": {
            "name": "Perennial",
            "sizes": {"small": 2000, "medium": 3500, "large": 5500}
        },
        "shade_tree": {
            "name": "Shade Tree",
            "sizes": {"small": 15000, "medium": 25000, "large": 45000}
        }
    },
    "placeholder_rates": true
}'::jsonb
WHERE slug = 'plants';
