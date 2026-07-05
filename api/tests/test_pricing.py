"""Pricing engine tests (R-07, R-08).

Must verify:
- quote_total === captured_total across the base×tier matrix (R-07)
- 4pm cutoff correct at DST boundaries + near local midnight (R-08)
- Bounds checks (yard cleanup 5 cu yd / 1 acre, stump diameter tiers)
- Multipliers applied via round-half-up once
"""

from __future__ import annotations

import math
from datetime import date, datetime, time, timedelta

import pytest

from app.config import BUSINESS_TZ
from app.services.pricing import (
    URGENCY_TIERS,
    QuoteResult,
    _is_tomorrow_available,
    _round_half_up,
    compute_base_cents,
    compute_price_for_tier,
    compute_tier_price,
    quote,
)

# --- Stump grinding pricing model (mirrors seed data) ---
STUMP_PM = {
    "unit": "diameter_tier",
    "base_rate_cents_by_diameter": {
        "under_12in": 12000,
        "12_18in": 18000,
        "18_24in": 25000,
        "over_24in": 35000,
    },
    "tier_multipliers": {"tomorrow": 2.00, "2_5_day": 1.25, "6_14_day": 1.00},
}

YARD_CLEANUP_PM = {
    "unit": "fixed_tier",
    "base_rate_cents": 45000,
    "tier_multipliers": {"tomorrow": 2.00, "2_5_day": 1.25, "6_14_day": 1.00},
    "bounds": {"max_combined_debris_cu_yd": 5, "max_property_acres": 1},
}

MULCH_PM = {
    "unit": "cubic_yard",
    "base_rate_cents_per_unit": 8500,
    "tier_multipliers": {"tomorrow": 2.00, "2_5_day": 1.25, "6_14_day": 1.00},
}

WEED_BLOCK_PM = {
    "unit": "sq_ft",
    "base_rate_cents_per_unit": 150,
    "tier_multipliers": {"tomorrow": 2.00, "2_5_day": 1.25, "6_14_day": 1.00},
}

TOPSOIL_PM = {
    "unit": "sq_ft",
    "base_rate_cents_per_unit": 200,
    "tier_multipliers": {"tomorrow": 2.00, "2_5_day": 1.25, "6_14_day": 1.00},
}


class TestRoundHalfUp:
    def test_exact_half_rounds_up(self):
        assert _round_half_up(0.5) == 1
        assert _round_half_up(1.5) == 2
        assert _round_half_up(2.5) == 3

    def test_below_half_rounds_down(self):
        assert _round_half_up(0.4) == 0
        assert _round_half_up(1.4) == 1

    def test_above_half_rounds_up(self):
        assert _round_half_up(0.6) == 1
        assert _round_half_up(1.6) == 2


class TestComputeBaseCents:
    def test_stump_single(self):
        base, ok, reason = compute_base_cents(STUMP_PM, {"diameter_tier": "18_24in", "count": 1})
        assert ok
        assert base == 25000

    def test_stump_multiple(self):
        base, ok, reason = compute_base_cents(STUMP_PM, {"diameter_tier": "12_18in", "count": 3})
        assert ok
        assert base == 54000  # 18000 * 3

    def test_stump_unknown_tier(self):
        base, ok, reason = compute_base_cents(STUMP_PM, {"diameter_tier": "nonexistent", "count": 1})
        assert not ok

    def test_yard_cleanup_within_bounds(self):
        base, ok, reason = compute_base_cents(
            YARD_CLEANUP_PM, {"combined_debris_cu_yd": 3, "property_acres": 0.5}
        )
        assert ok
        assert base == 45000

    def test_yard_cleanup_exceeds_debris(self):
        _, ok, reason = compute_base_cents(
            YARD_CLEANUP_PM, {"combined_debris_cu_yd": 6, "property_acres": 0.5}
        )
        assert not ok
        assert "5 cu yd" in reason

    def test_yard_cleanup_exceeds_acres(self):
        _, ok, reason = compute_base_cents(
            YARD_CLEANUP_PM, {"combined_debris_cu_yd": 3, "property_acres": 1.5}
        )
        assert not ok
        assert "1 acre" in reason

    def test_mulch_quantity(self):
        base, ok, _ = compute_base_cents(MULCH_PM, {"quantity": 4})
        assert ok
        assert base == 34000  # 8500 * 4

    def test_mulch_zero_quantity(self):
        _, ok, _ = compute_base_cents(MULCH_PM, {"quantity": 0})
        assert not ok

    def test_weed_block_quantity(self):
        base, ok, _ = compute_base_cents(WEED_BLOCK_PM, {"quantity": 200})
        assert ok
        assert base == 30000  # 150 * 200

    def test_weed_block_zero_quantity(self):
        _, ok, _ = compute_base_cents(WEED_BLOCK_PM, {"quantity": 0})
        assert not ok

    def test_topsoil_quantity(self):
        base, ok, _ = compute_base_cents(TOPSOIL_PM, {"quantity": 300})
        assert ok
        assert base == 60000  # 200 * 300

    def test_topsoil_zero_quantity(self):
        _, ok, _ = compute_base_cents(TOPSOIL_PM, {"quantity": 0})
        assert not ok

    def test_topsoil_fractional_rounds(self):
        base, ok, _ = compute_base_cents(TOPSOIL_PM, {"quantity": 1.5})
        assert ok
        assert base == 300  # 200 * 1.5 = 300.0 → 300

    def test_yard_cleanup_at_exact_bounds(self):
        base, ok, _ = compute_base_cents(
            YARD_CLEANUP_PM, {"combined_debris_cu_yd": 5, "property_acres": 1}
        )
        assert ok
        assert base == 45000


class TestComputeTierPrice:
    def test_no_multiplier(self):
        assert compute_tier_price(10000, 1.0) == 10000

    def test_double(self):
        assert compute_tier_price(10000, 2.0) == 20000

    def test_fractional_rounds_half_up(self):
        # 8500 * 1.25 = 10625.0 — exact, no rounding needed
        assert compute_tier_price(8500, 1.25) == 10625
        # 8500 * 2.0 = 17000 — exact
        assert compute_tier_price(8500, 2.0) == 17000

    def test_rounding_edge(self):
        # 33 * 1.25 = 41.25 → 41
        assert compute_tier_price(33, 1.25) == 41
        # 35 * 1.25 = 43.75 → 44
        assert compute_tier_price(35, 1.25) == 44


class TestQuoteEqualsCharge:
    """R-07: the quoted total MUST always equal the charged total.

    ``quote()`` and ``compute_price_for_tier()`` use the SAME function
    (``compute_tier_price``), so they must produce identical results.
    """

    @pytest.mark.parametrize("diameter_tier", ["under_12in", "12_18in", "18_24in", "over_24in"])
    @pytest.mark.parametrize("count", [1, 2, 5])
    @pytest.mark.parametrize("urgency_tier", URGENCY_TIERS)
    def test_stump_quote_equals_charge(self, diameter_tier, count, urgency_tier):
        config = {"diameter_tier": diameter_tier, "count": count}
        q = quote(STUMP_PM, config)
        assert q.bounds_ok

        charge, ok, _ = compute_price_for_tier(STUMP_PM, config, urgency_tier)
        assert ok
        assert q.tier_prices[urgency_tier]["total_cents"] == charge

    @pytest.mark.parametrize("urgency_tier", URGENCY_TIERS)
    def test_yard_cleanup_quote_equals_charge(self, urgency_tier):
        config = {"combined_debris_cu_yd": 3, "property_acres": 0.5}
        q = quote(YARD_CLEANUP_PM, config)
        charge, ok, _ = compute_price_for_tier(YARD_CLEANUP_PM, config, urgency_tier)
        assert ok
        assert q.tier_prices[urgency_tier]["total_cents"] == charge

    @pytest.mark.parametrize("quantity", [1, 3, 10])
    @pytest.mark.parametrize("urgency_tier", URGENCY_TIERS)
    def test_mulch_quote_equals_charge(self, quantity, urgency_tier):
        config = {"quantity": quantity}
        q = quote(MULCH_PM, config)
        charge, ok, _ = compute_price_for_tier(MULCH_PM, config, urgency_tier)
        assert ok
        assert q.tier_prices[urgency_tier]["total_cents"] == charge

    @pytest.mark.parametrize("quantity", [50, 200, 500])
    @pytest.mark.parametrize("urgency_tier", URGENCY_TIERS)
    def test_weed_block_quote_equals_charge(self, quantity, urgency_tier):
        config = {"quantity": quantity}
        q = quote(WEED_BLOCK_PM, config)
        charge, ok, _ = compute_price_for_tier(WEED_BLOCK_PM, config, urgency_tier)
        assert ok
        assert q.tier_prices[urgency_tier]["total_cents"] == charge

    @pytest.mark.parametrize("quantity", [100, 300, 1000])
    @pytest.mark.parametrize("urgency_tier", URGENCY_TIERS)
    def test_topsoil_quote_equals_charge(self, quantity, urgency_tier):
        config = {"quantity": quantity}
        q = quote(TOPSOIL_PM, config)
        charge, ok, _ = compute_price_for_tier(TOPSOIL_PM, config, urgency_tier)
        assert ok
        assert q.tier_prices[urgency_tier]["total_cents"] == charge


class TestTomorrowCutoff:
    """R-08: 4pm ET cutoff, tested at DST boundaries + near local midnight."""

    def test_before_cutoff(self):
        # 3:59pm ET — tomorrow should be available
        now = datetime(2026, 7, 15, 15, 59, tzinfo=BUSINESS_TZ)
        tomorrow = date(2026, 7, 16)
        assert _is_tomorrow_available(tomorrow, now) is True

    def test_after_cutoff(self):
        # 4:00pm ET — cutoff passed
        now = datetime(2026, 7, 15, 16, 0, tzinfo=BUSINESS_TZ)
        tomorrow = date(2026, 7, 16)
        assert _is_tomorrow_available(tomorrow, now) is False

    def test_just_after_cutoff(self):
        # 4:01pm ET
        now = datetime(2026, 7, 15, 16, 1, tzinfo=BUSINESS_TZ)
        tomorrow = date(2026, 7, 16)
        assert _is_tomorrow_available(tomorrow, now) is False

    def test_near_midnight_et(self):
        # 11:59pm ET — tomorrow is actually the day after, so next-day tier
        # should still not be available (cutoff already passed at 4pm)
        now = datetime(2026, 7, 15, 23, 59, tzinfo=BUSINESS_TZ)
        tomorrow = date(2026, 7, 16)
        assert _is_tomorrow_available(tomorrow, now) is False

    def test_dst_spring_forward(self):
        # March 8, 2026 — clocks spring forward at 2am ET
        # 3:59pm ET should still work
        now = datetime(2026, 3, 8, 15, 59, tzinfo=BUSINESS_TZ)
        tomorrow = date(2026, 3, 9)
        assert _is_tomorrow_available(tomorrow, now) is True

    def test_dst_fall_back(self):
        # Nov 1, 2026 — clocks fall back at 2am ET
        # 4:00pm ET cutoff should still hold
        now = datetime(2026, 11, 1, 16, 0, tzinfo=BUSINESS_TZ)
        tomorrow = date(2026, 11, 2)
        assert _is_tomorrow_available(tomorrow, now) is False

    def test_future_date_not_tomorrow(self):
        # Requesting a date that's 3 days out — always available regardless of cutoff
        now = datetime(2026, 7, 15, 17, 0, tzinfo=BUSINESS_TZ)
        future = date(2026, 7, 18)
        assert _is_tomorrow_available(future, now) is True

    def test_tier_availability_in_quote(self):
        now = datetime(2026, 7, 15, 16, 1, tzinfo=BUSINESS_TZ)
        tomorrow = date(2026, 7, 16)
        q = quote(
            STUMP_PM,
            {"diameter_tier": "under_12in", "count": 1},
            requested_date=tomorrow,
            now=now,
        )
        assert q.tier_prices["tomorrow"]["available"] is False
        assert q.tier_prices["2_5_day"]["available"] is True
        assert q.tier_prices["6_14_day"]["available"] is True
