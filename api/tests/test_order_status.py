import pytest

from app.models.order_status import (
    InvalidTransitionError,
    OrderStatus,
    can_transition,
    transition,
)


class TestValidTransitions:
    def test_pending_payment_to_authorized(self):
        assert transition(OrderStatus.PENDING_PAYMENT, OrderStatus.AUTHORIZED) == OrderStatus.AUTHORIZED

    def test_pending_payment_to_captured(self):
        assert transition(OrderStatus.PENDING_PAYMENT, OrderStatus.CAPTURED) == OrderStatus.CAPTURED

    def test_authorized_to_captured(self):
        assert transition(OrderStatus.AUTHORIZED, OrderStatus.CAPTURED) == OrderStatus.CAPTURED

    def test_authorized_to_needs_reslot(self):
        assert transition(OrderStatus.AUTHORIZED, OrderStatus.NEEDS_RESLOT) == OrderStatus.NEEDS_RESLOT

    def test_needs_reslot_to_confirmed_scheduled(self):
        assert (
            transition(OrderStatus.NEEDS_RESLOT, OrderStatus.CONFIRMED_SCHEDULED)
            == OrderStatus.CONFIRMED_SCHEDULED
        )

    def test_needs_reslot_to_cancelled(self):
        assert transition(OrderStatus.NEEDS_RESLOT, OrderStatus.CANCELLED) == OrderStatus.CANCELLED

    def test_full_authorized_needs_reslot_confirmed_chain(self):
        """R-03/R-04's signature chain: authorized -> needs_reslot -> (confirmed_scheduled | cancelled)."""
        s = OrderStatus.AUTHORIZED
        s = transition(s, OrderStatus.NEEDS_RESLOT)
        s = transition(s, OrderStatus.CONFIRMED_SCHEDULED)
        assert s == OrderStatus.CONFIRMED_SCHEDULED

    def test_full_authorized_needs_reslot_cancelled_chain(self):
        s = OrderStatus.AUTHORIZED
        s = transition(s, OrderStatus.NEEDS_RESLOT)
        s = transition(s, OrderStatus.CANCELLED)
        assert s == OrderStatus.CANCELLED

    def test_confirmed_scheduled_to_captured(self):
        """Spec §2.2: capture is permitted from authorized AND confirmed_scheduled."""
        assert transition(OrderStatus.CONFIRMED_SCHEDULED, OrderStatus.CAPTURED) == OrderStatus.CAPTURED

    def test_schedule_then_capture_chain(self):
        """Authorize-confirm flow where admin schedules first, captures later."""
        s = OrderStatus.AUTHORIZED
        s = transition(s, OrderStatus.CONFIRMED_SCHEDULED)
        s = transition(s, OrderStatus.CAPTURED)
        assert s == OrderStatus.CAPTURED

    def test_confirmed_scheduled_to_completed(self):
        assert transition(OrderStatus.CONFIRMED_SCHEDULED, OrderStatus.COMPLETED) == OrderStatus.COMPLETED

    def test_confirmed_scheduled_to_needs_reslot_bumped_by_bin(self):
        assert (
            transition(OrderStatus.CONFIRMED_SCHEDULED, OrderStatus.NEEDS_RESLOT)
            == OrderStatus.NEEDS_RESLOT
        )

    def test_rescheduled_to_confirmed_scheduled(self):
        assert (
            transition(OrderStatus.RESCHEDULED, OrderStatus.CONFIRMED_SCHEDULED)
            == OrderStatus.CONFIRMED_SCHEDULED
        )

    def test_pending_payment_to_expired(self):
        assert transition(OrderStatus.PENDING_PAYMENT, OrderStatus.EXPIRED) == OrderStatus.EXPIRED

    def test_authorized_to_expired(self):
        assert transition(OrderStatus.AUTHORIZED, OrderStatus.EXPIRED) == OrderStatus.EXPIRED


class TestInvalidTransitions:
    def test_terminal_states_have_no_outbound_transitions(self):
        for terminal in (OrderStatus.CANCELLED, OrderStatus.COMPLETED, OrderStatus.EXPIRED):
            for target in OrderStatus:
                if target == terminal:
                    continue
                assert not can_transition(terminal, target)
                with pytest.raises(InvalidTransitionError):
                    transition(terminal, target)

    def test_cannot_skip_from_pending_payment_to_confirmed_scheduled(self):
        assert not can_transition(OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED_SCHEDULED)
        with pytest.raises(InvalidTransitionError):
            transition(OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED_SCHEDULED)

    def test_cannot_reopen_needs_reslot_from_needs_reslot_to_authorized(self):
        assert not can_transition(OrderStatus.NEEDS_RESLOT, OrderStatus.AUTHORIZED)
        with pytest.raises(InvalidTransitionError):
            transition(OrderStatus.NEEDS_RESLOT, OrderStatus.AUTHORIZED)

    def test_cannot_go_backwards_from_captured_to_authorized(self):
        assert not can_transition(OrderStatus.CAPTURED, OrderStatus.AUTHORIZED)
        with pytest.raises(InvalidTransitionError):
            transition(OrderStatus.CAPTURED, OrderStatus.AUTHORIZED)

    def test_cannot_self_transition(self):
        for status in OrderStatus:
            assert not can_transition(status, status)

    def test_invalid_transition_error_carries_states(self):
        with pytest.raises(InvalidTransitionError) as exc_info:
            transition(OrderStatus.CANCELLED, OrderStatus.CAPTURED)
        assert exc_info.value.current == OrderStatus.CANCELLED
        assert exc_info.value.target == OrderStatus.CAPTURED


def test_every_status_value_matches_db_check_constraint():
    """Keeps the Python enum and the orders.status CHECK constraint (migration
    20260701000002_orders.sql) from drifting apart."""
    expected = {
        "pending_payment",
        "authorized",
        "captured",
        "confirmed_scheduled",
        "needs_reslot",
        "rescheduled",
        "cancelled",
        "completed",
        "expired",
    }
    assert {s.value for s in OrderStatus} == expected
