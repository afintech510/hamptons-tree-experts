"""Order status state machine (spec §2.2, R-21/R-03/R-04).

The enum and transition table are the single source of truth for valid order
status transitions. Money/capacity endpoints (Phase 03/05) must route every
status change through `transition()` rather than writing `status` directly.
"""

from __future__ import annotations

from enum import Enum


class OrderStatus(str, Enum):
    PENDING_PAYMENT = "pending_payment"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    CONFIRMED_SCHEDULED = "confirmed_scheduled"
    NEEDS_RESLOT = "needs_reslot"
    RESCHEDULED = "rescheduled"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    EXPIRED = "expired"


class InvalidTransitionError(Exception):
    """Raised when a transition isn't allowed from the current status."""

    def __init__(self, current: OrderStatus, target: OrderStatus):
        self.current = current
        self.target = target
        super().__init__(f"Cannot transition order from {current.value!r} to {target.value!r}")


# Valid transitions per spec §2.2:
# - pending_payment: the reserve-then-charge intermediate state (R-01)
# - authorized: Stripe auth hold live, awaiting crew confirmation (estimate/plants)
# - needs_reslot: soft-hold expired while authorized, or bumped by a BIN order (R-03/R-04);
#   must resolve to a concrete re-slot or a cancel, never silently dropped
# - capture is only reachable from authorized/confirmed_scheduled, after an atomic
#   slot re-assertion (R-03) — that re-assertion is Phase 03/05's job, not this module's
_TRANSITIONS: dict[OrderStatus, frozenset[OrderStatus]] = {
    OrderStatus.PENDING_PAYMENT: frozenset(
        {OrderStatus.AUTHORIZED, OrderStatus.CAPTURED, OrderStatus.CANCELLED, OrderStatus.EXPIRED}
    ),
    OrderStatus.AUTHORIZED: frozenset(
        {
            OrderStatus.CAPTURED,
            OrderStatus.CONFIRMED_SCHEDULED,
            OrderStatus.NEEDS_RESLOT,
            OrderStatus.CANCELLED,
            OrderStatus.EXPIRED,
        }
    ),
    OrderStatus.CAPTURED: frozenset({OrderStatus.CONFIRMED_SCHEDULED, OrderStatus.CANCELLED}),
    OrderStatus.CONFIRMED_SCHEDULED: frozenset(
        {
            OrderStatus.CAPTURED,
            OrderStatus.NEEDS_RESLOT,
            OrderStatus.RESCHEDULED,
            OrderStatus.CANCELLED,
            OrderStatus.COMPLETED,
        }
    ),
    OrderStatus.NEEDS_RESLOT: frozenset({OrderStatus.CONFIRMED_SCHEDULED, OrderStatus.CANCELLED}),
    OrderStatus.RESCHEDULED: frozenset(
        {OrderStatus.CONFIRMED_SCHEDULED, OrderStatus.NEEDS_RESLOT, OrderStatus.CANCELLED, OrderStatus.COMPLETED}
    ),
    OrderStatus.CANCELLED: frozenset(),
    OrderStatus.COMPLETED: frozenset(),
    OrderStatus.EXPIRED: frozenset(),
}


def can_transition(current: OrderStatus, target: OrderStatus) -> bool:
    return target in _TRANSITIONS.get(current, frozenset())


def transition(current: OrderStatus, target: OrderStatus) -> OrderStatus:
    """Return `target` if the transition from `current` is valid, else raise."""
    if not can_transition(current, target):
        raise InvalidTransitionError(current, target)
    return target
