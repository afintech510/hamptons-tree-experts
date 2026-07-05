"""Plant pricing unit tests (F-003, R-19).

Verifies compute_base_cents for plant_type_size_qty pricing unit:
catalog lookup, multi-item totals, quantity validation, and tier
multiplier application via the shared compute_tier_price function.
"""

import pytest

from app.services.pricing import (
    URGENCY_TIERS,
    compute_base_cents,
    compute_price_for_tier,
    compute_tier_price,
    quote,
)

PLANT_PM = {
    "unit": "plant_type_size_qty",
    "catalog": {
        "arborvitae": {
            "sizes": {"3ft": 7500, "5ft": 12000, "7ft": 18000},
        },
        "holly": {
            "sizes": {"2ft": 5000, "4ft": 9000},
        },
        "boxwood": {
            "sizes": {"1gal": 3500, "3gal": 6000},
        },
    },
    "tier_multipliers": {"tomorrow": 2.00, "2_5_day": 1.25, "6_14_day": 1.00},
}


class TestSingleItem:
    def test_single_plant(self):
        config = {"items": [{"plant_type": "arborvitae", "size": "5ft", "quantity": 1}]}
        base, ok, _ = compute_base_cents(PLANT_PM, config)
        assert ok
        assert base == 12000

    def test_single_plant_multiple_quantity(self):
        config = {"items": [{"plant_type": "arborvitae", "size": "3ft", "quantity": 3}]}
        base, ok, _ = compute_base_cents(PLANT_PM, config)
        assert ok
        assert base == 22500  # 7500 * 3


class TestMultipleItems:
    def test_two_different_plants(self):
        config = {"items": [
            {"plant_type": "arborvitae", "size": "5ft", "quantity": 2},
            {"plant_type": "holly", "size": "4ft", "quantity": 1},
        ]}
        base, ok, _ = compute_base_cents(PLANT_PM, config)
        assert ok
        assert base == 33000  # (12000 * 2) + (9000 * 1)

    def test_three_different_plants(self):
        config = {"items": [
            {"plant_type": "arborvitae", "size": "7ft", "quantity": 1},
            {"plant_type": "holly", "size": "2ft", "quantity": 2},
            {"plant_type": "boxwood", "size": "1gal", "quantity": 4},
        ]}
        base, ok, _ = compute_base_cents(PLANT_PM, config)
        assert ok
        assert base == 42000  # 18000 + (5000 * 2) + (3500 * 4)


class TestRejections:
    def test_unknown_plant_type(self):
        config = {"items": [{"plant_type": "cactus", "size": "3ft", "quantity": 1}]}
        _, ok, reason = compute_base_cents(PLANT_PM, config)
        assert not ok
        assert "cactus" in reason

    def test_unknown_size(self):
        config = {"items": [{"plant_type": "arborvitae", "size": "10ft", "quantity": 1}]}
        _, ok, reason = compute_base_cents(PLANT_PM, config)
        assert not ok
        assert "10ft" in reason

    def test_zero_quantity(self):
        config = {"items": [{"plant_type": "arborvitae", "size": "3ft", "quantity": 0}]}
        _, ok, _ = compute_base_cents(PLANT_PM, config)
        assert not ok

    def test_negative_quantity(self):
        config = {"items": [{"plant_type": "arborvitae", "size": "3ft", "quantity": -1}]}
        _, ok, _ = compute_base_cents(PLANT_PM, config)
        assert not ok

    def test_empty_items_list(self):
        _, ok, _ = compute_base_cents(PLANT_PM, {"items": []})
        assert not ok

    def test_missing_items_key(self):
        _, ok, _ = compute_base_cents(PLANT_PM, {})
        assert not ok


class TestTierMultiplierIntegration:
    """R-07: quote === charge for plants across all tiers."""

    @pytest.mark.parametrize("urgency_tier", URGENCY_TIERS)
    def test_quote_equals_charge_single_plant(self, urgency_tier):
        config = {"items": [{"plant_type": "holly", "size": "2ft", "quantity": 2}]}
        q = quote(PLANT_PM, config)
        assert q.bounds_ok
        charge, ok, _ = compute_price_for_tier(PLANT_PM, config, urgency_tier)
        assert ok
        assert q.tier_prices[urgency_tier]["total_cents"] == charge

    @pytest.mark.parametrize("urgency_tier", URGENCY_TIERS)
    def test_quote_equals_charge_multi_plant(self, urgency_tier):
        config = {"items": [
            {"plant_type": "arborvitae", "size": "7ft", "quantity": 1},
            {"plant_type": "boxwood", "size": "3gal", "quantity": 3},
        ]}
        q = quote(PLANT_PM, config)
        assert q.bounds_ok
        charge, ok, _ = compute_price_for_tier(PLANT_PM, config, urgency_tier)
        assert ok
        assert q.tier_prices[urgency_tier]["total_cents"] == charge

    def test_tomorrow_tier_doubles_price(self):
        config = {"items": [{"plant_type": "holly", "size": "2ft", "quantity": 1}]}
        base, ok, _ = compute_base_cents(PLANT_PM, config)
        assert ok
        assert base == 5000
        assert compute_tier_price(base, 2.0) == 10000

    def test_standard_tier_no_markup(self):
        config = {"items": [{"plant_type": "holly", "size": "2ft", "quantity": 1}]}
        base, ok, _ = compute_base_cents(PLANT_PM, config)
        assert ok
        assert compute_tier_price(base, 1.0) == 5000
