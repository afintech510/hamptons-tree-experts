-- Phase 01: seed data (spec §2.4)
-- Idempotent: safe to re-run (ON CONFLICT DO NOTHING keyed on natural unique columns).
--
-- SPEC-AMBIGUITY: §2.4 says "service types (8)" but only 7 are named across
-- F-003–F-009 (plants, mulch, weed-block, topsoil+reseed, yard-cleanup,
-- stump-grinding, tree-removal). Seeding the 7 spec-named types; flagged for
-- the owner to confirm whether an 8th service was intended before Phase 02/03/04.
--
-- SPEC-AMBIGUITY: R-07 pins "one concrete multiplier per tier per service" but the
-- locked spec gives only SOW planning ranges (~1.75-2.25x Tomorrow, ~1.15-1.35x
-- 2-5 day), not final dollar rates or exact pinned multipliers. The base rates and
-- multipliers below are PLACEHOLDER business data (mid-range values) so the
-- pricing_model column is populated and shaped correctly. Phase 03/04 (pricing
-- engine) and the business owner MUST replace these with the real rate card
-- before any service goes live for real checkout.

insert into service_types (slug, name, fulfillment_type, pricing_model, active) values
(
    'mulching',
    'Mulching',
    'bin_immediate',
    '{
        "unit": "cubic_yard",
        "base_rate_cents_per_unit": 8500,
        "tier_multipliers": {"tomorrow": 2.00, "2_5_day": 1.25, "6_14_day": 1.00},
        "placeholder_rates": true
    }'::jsonb,
    true
),
(
    'weed-block',
    'Weed Block Fabric',
    'bin_immediate',
    '{
        "unit": "sq_ft",
        "base_rate_cents_per_unit": 150,
        "tier_multipliers": {"tomorrow": 2.00, "2_5_day": 1.25, "6_14_day": 1.00},
        "placeholder_rates": true
    }'::jsonb,
    true
),
(
    'topsoil-reseeding',
    'Topsoil + Reseeding',
    'bin_immediate',
    '{
        "unit": "sq_ft",
        "base_rate_cents_per_unit": 200,
        "tier_multipliers": {"tomorrow": 2.00, "2_5_day": 1.25, "6_14_day": 1.00},
        "placeholder_rates": true
    }'::jsonb,
    true
),
(
    'yard-cleanup',
    'Bounded Yard Cleanup',
    'bin_immediate',
    '{
        "unit": "fixed_tier",
        "base_rate_cents": 45000,
        "tier_multipliers": {"tomorrow": 2.00, "2_5_day": 1.25, "6_14_day": 1.00},
        "bounds": {"max_combined_debris_cu_yd": 5, "max_property_acres": 1},
        "placeholder_rates": true
    }'::jsonb,
    true
),
(
    'stump-grinding',
    'Stump Grinding',
    'bin_immediate',
    '{
        "unit": "diameter_tier",
        "base_rate_cents_by_diameter": {
            "under_12in": 12000,
            "12_18in": 18000,
            "18_24in": 25000,
            "over_24in": 35000
        },
        "tier_multipliers": {"tomorrow": 2.00, "2_5_day": 1.25, "6_14_day": 1.00},
        "placeholder_rates": true
    }'::jsonb,
    true
),
(
    'plants',
    'Plants',
    'authorize_confirm',
    '{
        "unit": "plant_type_size_qty",
        "tier_multipliers": {"tomorrow": 2.00, "2_5_day": 1.25, "6_14_day": 1.00},
        "catalog": {},
        "note": "Plant type/size catalog and per-item pricing populated in Phase 05 (F-003).",
        "placeholder_rates": true
    }'::jsonb,
    true
),
(
    'tree-removal',
    'Tree Removal',
    'estimate',
    '{
        "unit": "estimate_range",
        "no_urgency_tier": true,
        "base_rate_cents_by_height_stories": {"1": 60000, "2": 90000, "3": 140000, "4_plus": 200000},
        "access_difficulty_multiplier": {"easy": 1.00, "moderate": 1.20, "difficult": 1.50},
        "range_variance_factor": 1.40,
        "note": "Deterministic wide-range algorithm (R-06) implemented in Phase 05; these are placeholder base figures.",
        "placeholder_rates": true
    }'::jsonb,
    true
)
on conflict (slug) do nothing;

-- 3 townships (all verified=false per R-29 until content is human-sourced/fact-checked).
-- East Hampton dropped per SOW N1. Manorville carries the mixed-jurisdiction caveat (N2).
insert into townships (name, permit_content, verified, jurisdiction_note) values
('Southampton', null, false, null),
('Riverhead', null, false, null),
('Brookhaven', null, false, 'Manorville straddles township lines; jurisdiction for permitting is not yet confirmed (SOW N2). Do not publish until verified.')
on conflict (name) do nothing;

-- 6 towns mapped to townships per §2.2.
insert into towns (name, slug, township_id)
select v.name, v.slug, t.id
from (values
    ('Westhampton', 'westhampton', 'Southampton'),
    ('Speonk', 'speonk', 'Southampton'),
    ('Remsenburg', 'remsenburg', 'Southampton'),
    ('Quogue', 'quogue', 'Southampton'),
    ('Riverhead', 'riverhead', 'Riverhead'),
    ('Manorville', 'manorville', 'Brookhaven')
) as v(name, slug, township_name)
join townships t on t.name = v.township_name
on conflict (slug) do nothing;
