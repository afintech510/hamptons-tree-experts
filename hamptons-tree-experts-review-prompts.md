# Meta-Agent Review Prompts — Hamptons Tree Experts Platform

This file contains one review prompt per build phase. **Usage:** after a builder completes a phase, open a **separate, fresh Claude Code session**, paste ONLY that phase's section (from its `# Meta-Agent Review: Phase NN` header down to the next one), append the builder's completion report where indicated, and run `claude --max-turns 25`. Independence is the point — the reviewer session must not be the builder session.

All reviewers share this output schema and verdict rules:

**Output:** valid JSON with `phase_reviewed`, `verdict` (PROMOTE | FIX | ESCALATE), `verdict_rationale`, `acceptance_criteria[]` (criterion/result/evidence), `spec_compliance` (sections_verified, deviations[]), `issues_found[]` (severity BLOCKER|WARNING|NOTE, file, line, description, fix), `cross_phase_notes[]`, `ambiguity_audit[]`, `recommendation`.

**Verdicts:** PROMOTE = all criteria pass, no BLOCKERs, deviations NOTE-level only. FIX = resolvable BLOCKERs / criteria failures (generate fix instructions). ESCALATE = needs a human architectural decision.

**Stance:** adversarial. Do not trust the builder's self-assessment — inspect the code on disk and re-run every acceptance criterion independently. Read `hamptons-tree-experts-spec-v2.md` as the source of truth.

---

# Meta-Agent Review: Phase 00 — Environment & Infrastructure
**Intensity: Light.** Focus: project structure, Docker config, and the two security-posture items that later phases depend on.

Read spec §1.2, §1.3, §4.1, §4.2. Verify independently:
- [ ] `docker compose up` starts `web`/`api`/`nginx` clean; container TZ resolves to `America/New_York` (R-08).
- [ ] Nginx routes the Stripe webhook + money endpoints DIRECT to FastAPI, not through a Next proxy (R-18) — inspect the config.
- [ ] No Nginx `location` serves `/var/hte/uploads`; the prohibition is commented (R-11).
- [ ] `.env.example` documents every §1.2 secret; no real secrets committed.
- [ ] Design tokens exist with the exact palette hex values; rust-orange reserved for pricing/CTAs only (F-017).
Escalate if the money-route posture or upload-serving prohibition is missing — those are security-load-bearing for later phases.
[Append builder's Phase 00 completion report here.]

---

# Meta-Agent Review: Phase 01 — Schema & Admin Auth Foundation
**Intensity: HEAVY.** Schema errors cascade into every later phase — scrutinize every column, type, constraint, and index.

Read spec §2 (all), §7 (all), §3.1. Verify independently:
- [ ] All 13 tables from §2.2 exist; columns/types/constraints/indexes match EXACTLY.
- [ ] **`UNIQUE (day, slot)` exists on `capacity_slots`** — the O-004 guarantee. This is the single most important check in the phase.
- [ ] All money columns are `integer` cents; NO float/numeric currency columns anywhere (§2.3).
- [ ] `orders.status` enum includes `needs_reslot` (R-03/R-04); the transition function rejects invalid transitions (run the unit tests).
- [ ] `original_quote_cents` is write-once (R-23); `order_number` generator is non-sequential/high-entropy (R-12).
- [ ] `townships.verified` defaults false (R-29); Manorville carries a jurisdiction_note (N2).
- [ ] `processed_webhooks` (R-10), `outbox_emails` (R-08-email), `job_runs` (R-31) exist per §2.2.
- [ ] Admin auth: `/api/v1/admin/ping` returns 401 without token, 200 with valid admin JWT; bootstrap forces password change + MFA.
- [ ] FKs match the §2.1 ER diagram; queries are parameterized.
FIX any column/constraint mismatch. ESCALATE if the invariant or status machine is structurally wrong.
[Append builder's Phase 01 completion report here.]

---

# Meta-Agent Review: Phase 02 — Marketing & Local-Authority Site
**Intensity: Medium.** Focus: SEO correctness, the verified-publish gate, and the non-templated content standard.

Read spec §4.1, §4.2, §1.2, §2.2. Verify independently:
- [ ] Build succeeds; service/town/permit/emergency pages generate.
- [ ] **Permit `generateStaticParams` filters `verified=true`** — a `verified=false` township (Manorville) produces NO page (R-29). Test this.
- [ ] Each town page has ≥3 non-transferable local references and links to its CORRECT township permit page (F-002) — spot-check that copy isn't city-name-swap boilerplate.
- [ ] Emergency/Storm page is live.
- [ ] LocalBusiness + Service schema validates; GA4 + Google Ads conversion event fires on lead-form submit (F-018).
- [ ] Manual capacity-pause toggle changes public messaging.
- [ ] Design tokens applied; rust-orange only on CTAs; responsive 375/768/1440.
- [ ] Hard gates: real photos (no placeholders, R-33); only verified permit content published.
FIX thin/templated town content or a broken verified-gate. NOTE stock-photo placeholders as a launch BLOCKER if present.
[Append builder's Phase 02 completion report here.]

---

# Meta-Agent Review: Phase 03 — Capacity + Pricing + Thin-Slice Checkout ⚠️ MONEY CORE
**Intensity: HEAVY.** This phase carries the highest-confidence review findings. Verify the money/capacity guarantees by inspection AND by running the tests.

Read spec §3.1, §3.2, §2.2, §5.1, §1.3. Verify independently:
- [ ] **R-01:** `/orders/bin` NEVER holds a DB transaction open across the Stripe call — inspect the code; confirm reserve (commit) → charge (outside txn) → confirm/compensate. Run the simulated-Stripe-failure test and confirm the slot is released.
- [ ] **O-004:** run the concurrent-oversell test — two simultaneous bookings for the last slot → exactly one 201, one 409. MUST pass.
- [ ] **R-07:** multipliers are pinned single values (not ranges); round-half-up applied once; ONE function backs quote + charge. Run the quote===charge matrix test.
- [ ] **R-08:** 4pm cutoff + date keys computed in America/New_York; run the DST + near-midnight tests.
- [ ] **R-09:** `Idempotency-Key` required on `/orders/bin`; duplicate key returns the original order.
- [ ] **R-16:** an expired tentative hold does NOT cause a false 409 for a valid BIN booking.
- [ ] **R-15:** a weather-blocked half rejects new bookings.
- [ ] **R-12/R-16:** `/orders/lookup` returns identical 404 for "no order" vs "wrong email."
- [ ] One real test-mode stump-grinding order completes end-to-end → `captured` with a reserved slot.
- [ ] Admin dashboard shows correct capacity + name/phone search.
- [ ] Background jobs advisory-locked (R-17); pricing/capacity logic is server-side only.
ANY failure of R-01, O-004, or R-07 is a FIX (or ESCALATE if structural). Do not PROMOTE the money core on the builder's word alone.
[Append builder's Phase 03 completion report here.]

---

# Meta-Agent Review: Phase 04 — Full BIN Catalog
**Intensity: Medium.** Focus: reuse of the Phase 03 core (no forking it) and the yard-cleanup bounds.

Read spec §3.2, §8.1. Verify independently:
- [ ] Mulch/weed-block/topsoil+reseed each complete a real test-mode capacity-checked reserve-then-charge order.
- [ ] Each uses the SHARED Phase 03 pricing/checkout/capacity engine — the builder did NOT fork or reimplement the money core. Inspect for duplication.
- [ ] Yard cleanup over 5 cu yd / 1 acre returns `BOUNDS_EXCEEDED` and does NOT create a BIN order (F-007); over-bound redirects to the estimate flow.
- [ ] quote===charge (R-07) still holds for the new services.
- [ ] Concurrent-oversell (O-004) holds with multiple service types competing for one slot.
FIX any reimplementation of the core or a missing bounds rejection.
[Append builder's Phase 04 completion report here.]

---

# Meta-Agent Review: Phase 05 — Authorize-Then-Confirm Flows ⚠️ MONEY CORE
**Intensity: HEAVY.** Second money-core phase — the state-machine and correlation findings live here.

Read spec §3.2, §3.3, §2.2, §5.1, §7.3, §7.4. Verify independently:
- [ ] **R-01:** estimate + plant endpoints reserve-then-charge (no Stripe-in-transaction).
- [ ] **R-02/Option B:** exactly THREE admin actions (Capture/Cancel/Extend). Confirm NO Increase/Decrease exists and no stored payment method / SetupIntent was introduced.
- [ ] **R-03:** run the oversell-via-money-path test — estimate → 48h soft-hold expiry → slot rebooked by BIN → manager Capture REFUSED with 409. MUST pass. Confirm Capture does an atomic `SELECT FOR UPDATE` slot re-assertion.
- [ ] **R-03:** soft-hold expiry on an `authorized` order → `needs_reslot`, NOT silent release.
- [ ] **R-04:** BIN bumps a tentative estimate → estimate `needs_reslot`, Stripe hold retained, concrete new slot offered; `bumped_by_bin` event records old slot + retained PI.
- [ ] **R-05:** Extend voids old PI → a stale `canceled` webhook for the old PI id is IGNORED (order stays authorized). Webhook correlates by active PI id + state.
- [ ] **R-06:** estimate range is deterministic for identical inputs; **R-34:** tree removal has NO urgency tier.
- [ ] **R-19:** plant endpoint uses fixed price + stock confirm, no range/photos.
- [ ] **R-11:** photos EXIF-stripped, magic-byte validated, served ONLY via the auth'd endpoint (never static); **R-20:** 90-day purge job works.
- [ ] **R-26:** Cancel scoped-deletes only its own slot.
- [ ] **R-13:** checkout blocked without active F-020 acknowledgment; confirm the legal-review status of the disclosure wording (BLOCKED until cleared).
ANY failure of R-01/R-03/R-04/R-05 is FIX or ESCALATE. Verify the money-path tests ran, don't take them on faith.
[Append builder's Phase 05 completion report here.]

---

# Meta-Agent Review: Phase 06 — Testing & Quality
**Intensity: Light-Medium.** Focus: the tests actually test what they claim, and the money-core tests genuinely exist and pass.

Read spec §9. Verify independently:
- [ ] The four money-core tests EXIST and PASS: concurrent-oversell (O-004), oversell-via-money-path (R-03), idempotent double-submit (R-09), reauth-void-not-cancel (R-05). Inspect them — confirm they assert the real behavior, not a trivial pass.
- [ ] E2E runs on Chromium/Firefox/WebKit at 375/768/1440.
- [ ] Unit: quote===charge matrix (R-07), status machine (R-21), cutoff DST (R-08), yard bounds (F-007).
- [ ] Integration: reserve-then-charge compensation (R-01); response shapes match §3.2.
- [ ] No test relies on shared mutable state.
FIX missing/hollow money-core tests. A green suite WITHOUT the four money-core tests is a FIX, not a PROMOTE.
[Append builder's Phase 06 completion report here.]

---

# Meta-Agent Review: Phase 07 — Deployment & Ops
**Intensity: HEAVY.** Production safety, secrets, rollback, health.

Read spec §1.3, §8.2, §8.3, §7.3. Verify independently:
- [ ] Production deploy succeeds over TLS on the domain; smoke tests pass.
- [ ] `/health` reports DB AND per-job freshness (R-31) — kill a job and confirm `/health` reflects it.
- [ ] Money-route-direct + no-static-uploads posture preserved in production config.
- [ ] DB + photo-volume backups on the same cadence; restore-and-verify test documented + passed (R-32); auth'd photo endpoint returns "photo unavailable" (not 500) on a missing file.
- [ ] Only one scheduler owner runs in production (R-17).
- [ ] No hardcoded secrets; rollback procedure documented + dry-run once.
FIX any production-safety gap. ESCALATE if backups/restore can't be verified before photos go live.
[Append builder's Phase 07 completion report here.]

---

# Phase 08 — Visual/UX Validation
No meta-agent review prompt: Phase 08 is itself a human-run validation (Claude in Chrome). Its output is the triage report, which the human reviews directly.
