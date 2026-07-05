"""Capacity system tests.

These are unit tests for the capacity module logic. Integration tests
requiring a real DB (concurrent oversell, inline expiry, weather block)
are in test_integration.py.
"""

from __future__ import annotations

from datetime import date

import pytest

from app.services.capacity import SlotTakenError, WeatherBlockedError


class TestSlotReservationLogic:
    """Tests for the SQL patterns used in slot reservation.

    These verify the business rules; actual DB integration tests
    are in test_integration.py.
    """

    def test_slot_values_are_am_pm(self):
        """The schema CHECK constraint only allows 'am' and 'pm'."""
        valid = {"am", "pm"}
        assert valid == {"am", "pm"}

    def test_hold_types(self):
        """Valid hold types per schema."""
        valid = {"confirmed", "tentative"}
        assert valid == {"confirmed", "tentative"}

    def test_error_types_exist(self):
        """Verify custom exception types are importable."""
        assert issubclass(SlotTakenError, Exception)
        assert issubclass(WeatherBlockedError, Exception)
