import re

from app.services.order_number import PREFIX, generate_order_number


def test_format_matches_prefix_plus_ten_base32_chars():
    order_number = generate_order_number()
    assert re.fullmatch(r"HTE-[A-Z2-7]{10}", order_number), order_number


def test_starts_with_prefix():
    assert generate_order_number().startswith(PREFIX)


def test_random_part_length_is_ten():
    order_number = generate_order_number()
    random_part = order_number[len(PREFIX) :]
    assert len(random_part) == 10


def test_high_entropy_no_collisions_across_many_samples():
    samples = {generate_order_number() for _ in range(20_000)}
    assert len(samples) == 20_000


def test_non_sequential_consecutive_calls_share_no_ordering_pattern():
    """Two consecutive generations must not differ by a predictable offset —
    guards against accidentally wiring this to a sequence/counter."""
    a = generate_order_number()
    b = generate_order_number()
    assert a != b
    # Random suffixes of consecutive calls should essentially never share a
    # common prefix of length >= 4 (would suggest a non-random generator).
    suffix_a, suffix_b = a[len(PREFIX) :], b[len(PREFIX) :]
    assert suffix_a[:4] != suffix_b[:4]


def test_excludes_padding_and_lowercase():
    order_number = generate_order_number()
    assert "=" not in order_number
    assert order_number == order_number.upper()
