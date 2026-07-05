"""Server-side pricing engine (spec §3.2, R-07, R-08).

ONE shared function computes the final integer-cents price. Used by both
``/pricing/quote`` and ``/orders/bin`` so the quoted total always equals
the charged total.

Rules:
- Pinned multipliers: one concrete value per tier, stored in
  ``service_types.pricing_model.tier_multipliers``.
- Round-half-up applied ONCE to produce integer cents.
- 4pm Tomorrow cutoff computed in America/New_York.
- Multiplier values are never returned to the client — only dollar totals.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Any

from app.config import BUSINESS_TZ

URGENCY_TIERS = ("tomorrow", "2_5_day", "6_14_day")

TOMORROW_CUTOFF_HOUR = 16  # 4:00 PM ET


@dataclass(frozen=True)
class QuoteResult:
    base_cents: int
    tier_prices: dict[str, dict[str, Any]]
    bounds_ok: bool
    bounds_reason: str | None = None
    range_low_cents: int | None = None
    range_high_cents: int | None = None


@dataclass(frozen=True)
class SingleTierPrice:
    total_cents: int


def _round_half_up(x: float) -> int:
    return int(math.floor(x + 0.5))


def _is_tomorrow_available(requested_date: date | None, now: datetime | None = None) -> bool:
    """Check if Tomorrow tier is available based on 4pm ET cutoff (R-08)."""
    if now is None:
        now = datetime.now(BUSINESS_TZ)
    else:
        now = now.astimezone(BUSINESS_TZ)

    today_et = now.date()
    cutoff = datetime.combine(today_et, time(TOMORROW_CUTOFF_HOUR, 0), tzinfo=BUSINESS_TZ)

    if requested_date is not None:
        tomorrow = today_et + timedelta(days=1)
        if requested_date != tomorrow:
            return requested_date > tomorrow
        return now < cutoff
    return now < cutoff


def compute_base_cents(pricing_model: dict, config: dict) -> tuple[int, bool, str | None]:
    """Compute the base price in cents from a service's pricing model and config.

    Returns (base_cents, bounds_ok, bounds_reason).
    """
    unit = pricing_model.get("unit")

    if unit == "diameter_tier":
        diameter_tier = config.get("diameter_tier", "")
        count = config.get("count", 1)
        rates = pricing_model.get("base_rate_cents_by_diameter", {})
        per_stump = rates.get(diameter_tier)
        if per_stump is None:
            return 0, False, f"Unknown diameter tier: {diameter_tier}"
        if count < 1:
            return 0, False, "Count must be at least 1"
        return per_stump * count, True, None

    if unit == "cubic_yard":
        quantity = config.get("quantity", 0)
        if quantity <= 0:
            return 0, False, "Quantity must be positive"
        rate = pricing_model.get("base_rate_cents_per_unit", 0)
        return _round_half_up(rate * quantity), True, None

    if unit == "sq_ft":
        quantity = config.get("quantity", 0)
        if quantity <= 0:
            return 0, False, "Quantity must be positive"
        rate = pricing_model.get("base_rate_cents_per_unit", 0)
        return _round_half_up(rate * quantity), True, None

    if unit == "fixed_tier":
        base = pricing_model.get("base_rate_cents", 0)
        bounds = pricing_model.get("bounds", {})
        debris = config.get("combined_debris_cu_yd", 0)
        acres = config.get("property_acres", 0)
        max_debris = bounds.get("max_combined_debris_cu_yd", 5)
        max_acres = bounds.get("max_property_acres", 1)
        if debris > max_debris:
            return 0, False, f"Debris exceeds {max_debris} cu yd — request an estimate"
        if acres > max_acres:
            return 0, False, f"Property exceeds {max_acres} acre — request an estimate"
        return base, True, None

    if unit == "plant_type_size_qty":
        items = config.get("items", [])
        if not items:
            return 0, False, "At least one plant item is required"
        catalog = pricing_model.get("catalog", {})
        total = 0
        for item in items:
            plant_type = item.get("plant_type", "")
            entry = catalog.get(plant_type)
            if entry is None:
                return 0, False, f"Unknown plant type: {plant_type}"
            sizes = entry.get("sizes", {})
            size = item.get("size", "")
            price = sizes.get(size)
            if price is None:
                return 0, False, f"Unknown size '{size}' for {plant_type}"
            qty = item.get("quantity", 0)
            if qty < 1:
                return 0, False, "Plant quantity must be at least 1"
            total += price * qty
        return total, True, None

    return 0, False, f"Unknown pricing unit: {unit}"


def compute_tier_price(base_cents: int, multiplier: float) -> int:
    """Apply a single tier multiplier and round-half-up ONCE (R-07)."""
    return _round_half_up(base_cents * multiplier)


def quote(
    pricing_model: dict,
    config: dict,
    requested_date: date | None = None,
    now: datetime | None = None,
    available_slots: dict[str, bool] | None = None,
) -> QuoteResult:
    """Compute a full quote with all tier prices.

    ``available_slots`` maps tier names to slot availability booleans (from
    the capacity system). If not provided, all tiers are marked available
    (capacity check is optional for the quote endpoint).
    """
    base_cents, bounds_ok, bounds_reason = compute_base_cents(pricing_model, config)
    if not bounds_ok:
        return QuoteResult(
            base_cents=0,
            tier_prices={},
            bounds_ok=False,
            bounds_reason=bounds_reason,
        )

    multipliers = pricing_model.get("tier_multipliers", {})
    tomorrow_available = _is_tomorrow_available(requested_date, now)

    tier_prices: dict[str, dict[str, Any]] = {}
    for tier in URGENCY_TIERS:
        mult = multipliers.get(tier, 1.0)
        total = compute_tier_price(base_cents, mult)
        slot_available = True
        if available_slots is not None:
            slot_available = available_slots.get(tier, True)

        available = slot_available
        if tier == "tomorrow" and not tomorrow_available:
            available = False

        tier_prices[tier] = {
            "total_cents": total,
            "available": available,
        }

    return QuoteResult(
        base_cents=base_cents,
        tier_prices=tier_prices,
        bounds_ok=True,
    )


def compute_price_for_tier(
    pricing_model: dict,
    config: dict,
    urgency_tier: str,
) -> tuple[int, bool, str | None]:
    """Compute the exact price for a specific tier. Used by the checkout path.

    Returns (total_cents, bounds_ok, bounds_reason). This is the SAME
    calculation as ``quote()`` — no divergence possible (R-07).
    """
    base_cents, bounds_ok, bounds_reason = compute_base_cents(pricing_model, config)
    if not bounds_ok:
        return 0, False, bounds_reason

    multipliers = pricing_model.get("tier_multipliers", {})
    mult = multipliers.get(urgency_tier, 1.0)
    total = compute_tier_price(base_cents, mult)
    return total, True, None


def compute_estimate_range(
    pricing_model: dict,
    config: dict,
) -> tuple[int, int, bool, str | None]:
    """Compute the estimate range in cents (R-06). Deterministic for identical inputs.

    Returns (range_low_cents, range_high_cents, ok, reason).
    """
    if pricing_model.get("unit") != "estimate_range":
        return 0, 0, False, "Not an estimate-range service"

    height = str(config.get("approx_height_stories", "1"))
    rates = pricing_model.get("base_rate_cents_by_height_stories", {})
    base = rates.get(height)
    if base is None:
        return 0, 0, False, f"Unknown height tier: {height}"

    access = config.get("access_difficulty", "easy")
    access_mults = pricing_model.get("access_difficulty_multiplier", {})
    access_mult = access_mults.get(access)
    if access_mult is None:
        return 0, 0, False, f"Unknown access difficulty: {access}"

    base_adjusted = _round_half_up(base * access_mult)

    variance = pricing_model.get("range_variance_factor", 1.4)
    range_low_cents = base_adjusted
    range_high_cents = _round_half_up(base_adjusted * variance)

    return range_low_cents, range_high_cents, True, None
