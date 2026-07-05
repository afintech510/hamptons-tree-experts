# PROGRESS: Hamptons Tree Experts Platform

**Spec:** v2 (LOCKED) | **SOW:** v2.2 | **Started:** Jul 1 2026
**Status legend:** ⬜ NOT STARTED · 🔨 IN PROGRESS · 🔍 IN REVIEW · ✅ COMPLETE · ❌ FAILED · ⏸️ BLOCKED

## Phase Status

| Phase | Name | Status | Builder session | Review verdict | Notes |
|-------|------|--------|-----------------|----------------|-------|
| 00 | Environment & Infrastructure | ✅ | — | — | docker-compose/web/api/nginx scaffold present; TZ + money-route-bypass posture in place |
| 01 | Schema & Admin Auth Foundation | 🔍 | current session | pending human review | 8 migrations verified end-to-end on a real local Postgres (O-004, R-23, append-only order_events all proven live) + status machine + order-number gen + admin JWT/MFA auth; unit tests pass (31/31); human gate — schema errors cascade |
| 02 | Marketing & Local-Authority Site | 🔍 | current session | pending human review | All 6 tasks complete; build passes; R-29 gate enforced (0 permit pages); hard gates remain: real photography (R-33) + verified permit content (R-29) |
| 03 | Capacity + Pricing + Thin-Slice Checkout | 🔍 | current session | pending human review | ⚠️ MONEY CORE; 107 tests pass; reserve-then-charge (R-01), oversell prevention (O-004), pricing R-07, cutoff R-08 all implemented |
| 04 | Full BIN Catalog | 🔍 | current session | pending human review | All 3 tasks complete; 5 BIN configurators + booking flow (configure→checkout→confirmation) built; 131 tests pass (95 pricing incl. new weed-block/topsoil); bounds enforcement + BOUNDS_EXCEEDED redirect verified; build clean |
| 05 | Authorize-Then-Confirm Flows | 🔍 | prior session | pending human review | ⚠️ MONEY CORE; authorize-confirm router, reauth tokens, admin hold actions (capture/cancel/extend), reschedule, BIN bump-tentative all implemented; human gate after; legal gate on F-020 |
| 06 | Testing & Quality | 🔍 | current session | pending human review | 213 passed / 10 skipped (DB-dependent); 6 new test files covering R-05/R-10 webhooks, R-01 compensation, R-12/R-16 uniform-404, reauth HMAC, estimate range, plant pricing, soft-hold expiry; Playwright config + E2E specs for money-core (O-004, R-09, BIN/estimate/authorize flows); build clean |
| 07 | Deployment & Ops | ⬜ | — | — | Final prod sign-off before |
| 08 | Visual/UX Validation (Claude in Chrome) | ⬜ | — | — | Human-triggered |

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Jul 1 2026 | Spec locked at v2 without a 2nd review cycle | Owner call; fixes well-understood, all 34 findings applied and traced |
| Jul 1 2026 | Payment model = Option B (Capture/Cancel/Extend, no Increase/Decrease) | Off-session re-auth needs a stored card; project deliberately stores none |
| Jul 1 2026 | Tree removal has no urgency tier (R-34) | Tier multipliers are a bounded-BIN concept; tree-removal urgency = slot choice |
| Jul 2 2026 | Seeded 7 service_types, not the 8 stated in spec §2.4 | Only 7 are named across F-003–F-009; flagged `// SPEC-AMBIGUITY` in the seed migration for owner confirmation before Phase 02/03/04 |
| Jul 2 2026 | Seed `pricing_model` base rates/multipliers are placeholder business data | §2.2/R-07 pin *structure* (one concrete multiplier per tier) but the locked spec gives no final dollar rate card; placeholders marked `placeholder_rates: true` in each row — MUST be replaced with real figures before Phase 03/04 checkout goes live |

## Blocked Items

_None currently open._

## Pre-Launch External Gates (not code — must clear before the phases that depend on them)

- [ ] **Real crew/job photography** sourced → blocks Phase 02 launch (R-33)
- [ ] **Verified permit/ordinance content** for Southampton, Riverhead, Brookhaven (Manorville jurisdiction confirmed) → blocks Phase 02 permit pages (R-29, N2)
- [ ] **F-020 no-refund disclosure wording legal review** → blocks Phase 05 ship (R-13)
- [ ] **Stripe account live** → blocks Phase 03
- [ ] **Crew daily capacity confirmed** (2 slots AM/PM assumed) → informs Phase 03 seed
- [ ] **Business phone number** confirmed → lead form + order-lookup recovery copy
