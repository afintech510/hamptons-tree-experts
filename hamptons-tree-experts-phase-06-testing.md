# Phase 06: Testing & Quality
**Project:** Hamptons Tree Experts Platform
**Spec:** `hamptons-tree-experts-spec-v2.md`
**Build Plan:** `hamptons-tree-experts-buildplan.md`
**Prerequisites:** Phases 02, 04, 05 complete
**Implements:** Test coverage for all features (spec §9)
**Recommended:** `claude --max-turns 75`

---

## 1. Context

You are executing **Phase 06: Testing & Quality** — Playwright E2E, unit, and integration coverage per spec §9, prioritizing the money core.

**Your scope is strictly this phase.** Write tests. Do NOT add features or refactor application code except to fix defects your tests surface (document any such fix). If a test reveals a spec-level problem, mark it `// ESCALATE:` rather than silently changing behavior.

**Tech Stack (spec §1.2, §9.1):** Playwright (Chromium primary + Firefox + WebKit), pytest for unit/integration, Stripe test mode.
**Working Directory:** project root.
**Spec File:** `hamptons-tree-experts-spec-v2.md` — READ §9 (all) FIRST, plus the acceptance criteria of Phases 03 and 05.

### What Already Exists
- Phases 00–05: full stack — marketing site, capacity/pricing/BIN checkout, full BIN catalog, and authorize-then-confirm flows. Each phase left some of its own unit tests; this phase adds the comprehensive E2E + integration layer and fills unit gaps.

### What You're Building
The test suite that proves the money core behaves correctly — especially the oversell-prevention and payment-integrity guarantees the review cycle was built around.

---

## 2. Objective & Deliverables

### Objective
After this phase, all critical user journeys pass E2E across the browser/viewport matrix, unit coverage meets spec §9.2 targets, and the money-core guarantees are proven by tests, not assertions.

### Deliverables
1. Playwright setup — §9.3: Chromium/Firefox/WebKit, viewports 375/768/1440, screenshot-on-failure, test-mode Stripe, isolated per-test seeding.
2. E2E tests for every MUST journey in §9.3, including the money-core tests below.
3. Unit tests filling §9.2 gaps: pricing/rounding (R-07), status state machine (R-21), soft-hold expiry, timezone cutoff at DST (R-08).
4. Integration tests: API response shapes match §3.2; reserve-then-charge failure compensation (R-01); idempotency (R-09); webhook PI-correlation (R-05).
5. Seed/fixture scripts — §9.5 (fictional PII only, per-test isolation, same migrations as prod).

---

## 3. Implementation Instructions

### Task 1: Playwright + test infra
**Spec Reference:** §9.3, §9.5
**Creates:** Playwright config, seed scripts, fixtures
Configure browsers + viewport matrix, per-test seeding + cleanup (no shared mutable state), Stripe test mode, screenshot-on-failure.

### Task 2: Money-core E2E (the ones that matter most)
**Spec Reference:** §9.3
**Creates:** E2E specs
Implement, as MUST-pass:
- **Concurrent-oversell (O-004):** two simultaneous bookings for the last slot → exactly one 201, one 409.
- **Oversell-via-money-path (R-03):** estimate → 48h soft-hold expiry → slot rebooked by BIN → manager Capture REFUSED with 409.
- **Idempotent double-submit (R-09):** same Idempotency-Key twice on `/estimates` and `/orders/bin` → one order/hold/slot.
- **Reauth-void-not-cancel (R-05):** Extend voids old PI → stale `canceled` webhook for old PI ignored, order stays authorized.
- BIN checkout (stump grinding) end-to-end; estimate submit → auth hold + tentative slot; three admin actions (capture/cancel/extend); reschedule (same amount, tier delta logged); BIN bumps tentative → `needs_reslot` + concrete offer.

### Task 3: Unit gaps
**Spec Reference:** §9.2
**Creates:** unit tests
Pricing quote===charge across base×tier matrix + rounding (R-07); status transition validity/invalidity (R-21); soft-hold 48h expiry; 4pm cutoff across DST + near local midnight (R-08); yard-cleanup bounds (F-007).

### Task 4: Integration + contract tests
**Spec Reference:** §3.2, §9.1
**Creates:** integration tests
API response shapes match §3.2; reserve-then-charge compensation on simulated Stripe failure/latency (R-01); webhook dedup + PI-correlation (R-05/R-10); uniform-404 lookup with no oracle (R-12/R-16).

---

## 4. Acceptance Criteria

### Automated
- [ ] All MUST E2E journeys pass on Chromium, Firefox, WebKit at 375/768/1440.
- [ ] The four money-core tests (O-004, R-03, R-09, R-05) all pass.
- [ ] Unit coverage meets §9.2 targets; pricing/rounding, state machine, cutoff-DST tests pass.
- [ ] Integration: reserve-then-charge compensation verified; response shapes match §3.2.
- [ ] No test relies on shared mutable state (parallel-safe).

### Functional
- [ ] A failing money-core test blocks promotion (these are the crown-jewel guarantees).

---

## 5. Constraints

### Hard (violation = phase failure)
- The four money-core tests (O-004, R-03, R-09, R-05) MUST exist and pass — a green suite without them is a phase failure.
- No feature additions; test-only, except documented defect fixes.
- Fictional PII only in fixtures.

### Soft (document deviations)
- If a test reveals a genuine spec ambiguity/contradiction, `// ESCALATE:` rather than changing behavior silently.

---

## 6. Completion Protocol
Standard structured report. In **Acceptance Criteria Results**, show pass/fail for each of the four money-core tests explicitly. List any defects the tests surfaced and how they were resolved (or escalated).

---

## 7. Execution & Orchestration

### Run Configuration
`claude --max-turns 75`. High — plan for 1-2 `--continue` cycles.

### Resumption (--continue)
Re-read this prompt, inspect existing tests, resume at the first incomplete task. Do not duplicate tests phases already wrote — fill gaps and add the E2E/integration layer.

### Autonomous Decision Authority
Spec defines expected behavior → test against it. Ambiguity → `// SPEC-AMBIGUITY:`. Behavior contradicts spec → `// ESCALATE:`.

### Progress Tracking
Update `PHASE-06-PROGRESS.md` after each task.
