"""Pricing API (spec §3.2 — /pricing/quote, /services)."""

from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from supabase import Client, create_client

from app.config import settings
from app.services.pricing import compute_estimate_range, quote

router = APIRouter(prefix="/api/v1", tags=["pricing"])


def _supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_key)


class QuoteRequest(BaseModel):
    service_slug: str
    config: dict[str, Any]
    urgency_tier: str | None = None
    requested_date: date | None = None


class TierPrice(BaseModel):
    total_cents: int
    available: bool


class QuoteResponse(BaseModel):
    base_cents: int
    tier_prices: dict[str, TierPrice]
    bounds_ok: bool
    bounds_reason: str | None = None
    range_low_cents: int | None = None
    range_high_cents: int | None = None


class ServiceOut(BaseModel):
    id: str
    slug: str
    name: str
    fulfillment_type: str
    pricing_model: dict[str, Any]
    active: bool


@router.get("/services")
async def list_services() -> list[ServiceOut]:
    result = (
        _supabase()
        .table("service_types")
        .select("id, slug, name, fulfillment_type, pricing_model, active")
        .eq("active", True)
        .execute()
    )
    services = []
    for row in result.data or []:
        pm = dict(row["pricing_model"])
        pm.pop("tier_multipliers", None)
        pm.pop("placeholder_rates", None)
        services.append(
            ServiceOut(
                id=row["id"],
                slug=row["slug"],
                name=row["name"],
                fulfillment_type=row["fulfillment_type"],
                pricing_model=pm,
                active=row["active"],
            )
        )
    return services


@router.post("/pricing/quote")
async def get_quote(body: QuoteRequest) -> QuoteResponse:
    result = (
        _supabase()
        .table("service_types")
        .select("pricing_model, fulfillment_type")
        .eq("slug", body.service_slug)
        .eq("active", True)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_SERVICE", "message": f"Unknown service: {body.service_slug}", "details": {}}},
        )

    pricing_model = rows[0]["pricing_model"]
    fulfillment_type = rows[0]["fulfillment_type"]

    if fulfillment_type == "estimate" and pricing_model.get("no_urgency_tier"):
        low, high, ok, reason = compute_estimate_range(pricing_model, body.config)
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"error": {"code": "BOUNDS_EXCEEDED", "message": reason or "Configuration out of bounds", "details": {}}},
            )
        return QuoteResponse(
            base_cents=low,
            tier_prices={},
            bounds_ok=True,
            range_low_cents=low,
            range_high_cents=high,
        )

    q = quote(pricing_model, body.config, body.requested_date)

    if not q.bounds_ok:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "BOUNDS_EXCEEDED", "message": q.bounds_reason or "Configuration out of bounds", "details": {}}},
        )

    return QuoteResponse(
        base_cents=q.base_cents,
        tier_prices={k: TierPrice(**v) for k, v in q.tier_prices.items()},
        bounds_ok=q.bounds_ok,
        bounds_reason=q.bounds_reason,
    )
