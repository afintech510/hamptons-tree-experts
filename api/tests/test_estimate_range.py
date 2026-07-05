"""Estimate range pricing tests (R-06).

Verifies compute_estimate_range produces correct low/high bounds across
the height × access-difficulty matrix, and rejects invalid inputs.
"""

import pytest

from app.services.pricing import _round_half_up, compute_estimate_range

TREE_REMOVAL_PM = {
    "unit": "estimate_range",
    "base_rate_cents_by_height_stories": {
        "1": 80000,
        "2": 150000,
        "3": 250000,
    },
    "access_difficulty_multiplier": {
        "easy": 1.0,
        "moderate": 1.3,
        "difficult": 1.6,
    },
    "range_variance_factor": 1.4,
}


class TestBasicRange:
    def test_1_story_easy(self):
        low, high, ok, _ = compute_estimate_range(
            TREE_REMOVAL_PM, {"approx_height_stories": "1", "access_difficulty": "easy"}
        )
        assert ok
        assert low == 80000
        assert high == _round_half_up(80000 * 1.4)

    def test_2_story_moderate(self):
        low, high, ok, _ = compute_estimate_range(
            TREE_REMOVAL_PM, {"approx_height_stories": "2", "access_difficulty": "moderate"}
        )
        assert ok
        expected_low = _round_half_up(150000 * 1.3)
        assert low == expected_low
        assert high == _round_half_up(expected_low * 1.4)

    def test_3_story_difficult(self):
        low, high, ok, _ = compute_estimate_range(
            TREE_REMOVAL_PM, {"approx_height_stories": "3", "access_difficulty": "difficult"}
        )
        assert ok
        expected_low = _round_half_up(250000 * 1.6)
        assert low == expected_low
        assert high == _round_half_up(expected_low * 1.4)


class TestRangeInvariants:
    @pytest.mark.parametrize("height", ["1", "2", "3"])
    @pytest.mark.parametrize("access", ["easy", "moderate", "difficult"])
    def test_low_always_less_than_high(self, height, access):
        low, high, ok, _ = compute_estimate_range(
            TREE_REMOVAL_PM, {"approx_height_stories": height, "access_difficulty": access}
        )
        assert ok
        assert low < high

    @pytest.mark.parametrize("height", ["1", "2", "3"])
    @pytest.mark.parametrize("access", ["easy", "moderate", "difficult"])
    def test_result_is_integer_cents(self, height, access):
        low, high, ok, _ = compute_estimate_range(
            TREE_REMOVAL_PM, {"approx_height_stories": height, "access_difficulty": access}
        )
        assert ok
        assert isinstance(low, int)
        assert isinstance(high, int)


class TestCustomVariance:
    def test_larger_variance_widens_range(self):
        pm = {**TREE_REMOVAL_PM, "range_variance_factor": 2.0}
        low, high, ok, _ = compute_estimate_range(
            pm, {"approx_height_stories": "1", "access_difficulty": "easy"}
        )
        assert ok
        assert low == 80000
        assert high == _round_half_up(80000 * 2.0)

    def test_default_variance_when_missing(self):
        pm = {k: v for k, v in TREE_REMOVAL_PM.items() if k != "range_variance_factor"}
        low, high, ok, _ = compute_estimate_range(
            pm, {"approx_height_stories": "1", "access_difficulty": "easy"}
        )
        assert ok
        assert high == _round_half_up(80000 * 1.4)


class TestRejections:
    def test_unknown_height(self):
        _, _, ok, reason = compute_estimate_range(
            TREE_REMOVAL_PM, {"approx_height_stories": "5", "access_difficulty": "easy"}
        )
        assert not ok
        assert "height" in reason.lower()

    def test_unknown_access_difficulty(self):
        _, _, ok, reason = compute_estimate_range(
            TREE_REMOVAL_PM, {"approx_height_stories": "1", "access_difficulty": "impossible"}
        )
        assert not ok
        assert "access" in reason.lower()

    def test_wrong_unit_type(self):
        pm = {"unit": "cubic_yard", "base_rate_cents_per_unit": 8500}
        _, _, ok, reason = compute_estimate_range(pm, {})
        assert not ok
        assert "estimate-range" in reason.lower()


class TestDefaults:
    def test_defaults_to_height_1_when_missing(self):
        low, high, ok, _ = compute_estimate_range(
            TREE_REMOVAL_PM, {"access_difficulty": "easy"}
        )
        assert ok
        assert low == 80000

    def test_numeric_height_converted_to_string(self):
        low, _, ok, _ = compute_estimate_range(
            TREE_REMOVAL_PM, {"approx_height_stories": 2, "access_difficulty": "easy"}
        )
        assert ok
        assert low == 150000
