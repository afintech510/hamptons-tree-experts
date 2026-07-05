"""High-entropy order number generator (spec §2.2, R-12).

Format: a fixed 4-char business prefix ("HTE-") + 10 random base32 characters,
e.g. HTE-7K2P9QX4MB. Deliberately NOT sequential and NOT derived from the order
id/created_at — a sequential id hands an enumeration attacker half the lookup
payload for free (see the uniform-404 order lookup, §3.2 GET /orders/lookup).
"""

from __future__ import annotations

import secrets

PREFIX = "HTE-"
# RFC 4648 base32 alphabet. Full A-Z2-7 (no exclusions) per the spec's own
# example ("HTE-7K2P9QX4MB" contains a '9' and no ambiguity-avoidance scheme
# is specified) — kept simple and exactly reproducible from the spec text.
_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
_RANDOM_LENGTH = 10


def generate_order_number() -> str:
    random_part = "".join(secrets.choice(_ALPHABET) for _ in range(_RANDOM_LENGTH))
    return f"{PREFIX}{random_part}"
