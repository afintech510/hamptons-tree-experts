# Phase 03: Capacity + Pricing + Thin-Slice Checkout ⚠️ MONEY CORE
**Project:** Hamptons Tree Experts Platform
**Spec:** `hamptons-tree-experts-spec-v2.md`
**Build Plan:** `hamptons-tree-experts-buildplan.md`
**Prerequisites:** Phase 01 complete
**Implements:** F-008, F-010, F-011, F-012, F-014, F-015
**Parallel with:** Phase 02 (no shared files)
**Recommended:** `claude --max-turns 100`

---

## 1. Context

You are executing **Phase 03: Capacity + Pricing + Thin-Slice Checkout** — the money-and-capacity core of the platform. **This is the highest-risk phase in the build.** All three independent spec reviewers flagged CRITICAL defects that live in exactly this scope. Build carefully and follow the danger-zone warnings below to the letter.

**Your scope is strictly this phase.** Build the capacity system, the pricing engine, ONE end-to-end paid BIN checkout (stump grinding, F-008), guest lookup, and the admin dashboard. Do NOT build the tree-removal estimate flow, plant orders, or the authorize-then-confirm actions — those are Phase 05. Do NOT build the remaining BIN catalog items — that is Phase 04.

**Tech Stack (spec §1.2):** FastAPI (all pricing/capacity logic server-side — never client-side), Supabase/PostgreSQL, Stripe (standard auth/capture, no SetupIntent), Next.js checkout UI.
**Working Directory:** project root.
**Spec File:** `hamptons-tree-experts-spec-v2.md` — READ §3.1, §3.2 (pricing/quote, /orders/bin, /orders/lookup, admin), §2.2 (capacity, orders), §5.1, §1.3 (jobs) FIRST.

### What Already Exists
- Phase 00: Docker stack, `America/New_York` timezone, Nginx money-route-direct posture, design tokens.
- Phase 01: full schema incl. `capacity_days`/`capacity_slots` with the `UNIQUE(day,slot)` invariant, `orders` with the status state machine (incl. `needs_reslot`), `service_types` with `pricing_model`, `processed_webhooks`, `outbox_emails`, `job_runs`; admin auth + JWT middleware.

### What You're Building
A capacity system where oversell is structurally impossible, a server-side pricing engine with pinned multipliers, one real paid BIN checkout that never charges without recording, guest order lookup with no enumeration oracle, and the admin dashboard.

---

## ⚠️ DANGER ZONE — read before writing any code

Three CRITICAL review findings live in this phase. These are not suggestions:

- **R-01 — NEVER hold a DB transaction open across the Stripe network call.** Use **reserve-then-charge with compensation** (spec §3.2 /orders/bin Behavior): Txn 1 commits the slot reservation + `pending_payment` order; call Stripe OUTSIDE any transaction; Txn 2 sets `captured`; on failure/timeout run a compensating slot release and reconcile via webhook. Wrapping Stripe in a transaction risks charge-without-record money loss — the single highest-confidence finding of the entire review.
- **O-004 — oversell must be impossible.** The `UNIQUE(day,slot)` constraint is your backstop, but you must also implement the inline-expiry-on-conflict (R-16) and weather-block `FOR UPDATE` (R-15) patterns from §2.2 so expired holds don't cause false 409s and blocked days can't be booked.
- **R-07 — pinned multipliers + one rounding rule.** Multipliers are single pinned values in `pricing_model`, NOT the SOW's `~` ranges. Compute final integer cents with round-half-up applied ONCE, in a single function reused by both `/pricing/quote` and `/orders/bin`, so the quote always equals the charge.

Also mandatory here: **R-08** (all date/cutoff math in `America/New_York`), **R-09** (idempotency keys required on `/orders/bin`), **R-12/R-16** (uniform-404 lookup, no enumeration oracle), **R-17** (advisory-lock the background jobs).

---

## 2. Objective & Deliverables

### Objective
After this phase, a customer can complete one real, paid, capacity-checked stump-grinding order end-to-end; oversell is impossible even under concurrent requests; and the admin can see the day's/week's real capacity and orders.

### Deliverables
1. Capacity system — F-011, §2.2/§1.3: 2 shared slots/day (AM/PM) across all services; inline-expiry-on-conflict (R-16); weather-block `FOR UPDATE` (R-15); lazy `capacity_days` upsert (R-14); soft-hold expiry job (advisory-locked, R-17).
2. Pricing engine — F-010, §3.2: `POST /pricing/quote`, pinned multipliers + round-half-up-once (R-07), 4pm Tomorrow cutoff in America/New_York (R-08), bounds checks; multipliers never returned to client.
3. BIN checkout — F-012, §3.2: `POST /orders/bin` reserve-then-charge (R-01), mandatory `Idempotency-Key` (R-09), immediate capture, BIN-bumps-tentative behavior stubbed for now (full bump lands in Phase 05 when estimates exist — implement the slot-conflict path but note tentative holds won't exist until Phase 05).
4. Stump grinding as the thin-slice BIN item — F-008, §3.2: diameter × count pricing; measurement-diagram UI note; NO on-site upward price adjustment (over-tier routes to estimate flow, which is Phase 05 — for now, cap at booked tier).
5. Guest lookup — F-014, §3.2: `GET /orders/lookup` with uniform 404 (R-12/R-16), rate-limited on true client IP.
6. Admin dashboard — F-015, §3.2/§4.1: today/tomorrow/week, confirmed vs. tentative, `needs_reslot` alert surface, customer name/phone search (R-22).
7. Stripe webhook — §3.3: signature verification (raw body, direct-to-FastAPI per Phase 00), `processed_webhooks` dedup (R-10), used to reconcile ambiguous BIN captures (R-01).

---

## 3. Implementation Instructions

### Task 1: Pricing engine (server-side, pinned, rounded once)
**Spec Reference:** §3.2 (/pricing/quote, R-07), §2.2 (`service_types.pricing_model`), R-08
**Creates:** pricing module + unit tests
Single server-side pricing function. Read pinned per-tier multipliers from `pricing_model`. Apply round-half-up ONCE to produce integer cents. The SAME function backs `/pricing/quote` and order creation. 4pm Tomorrow cutoff computed in America/New_York. Bounds checks (yard cleanup 5 cu yd/1 acre, stump diameter tier) return `bounds_ok:false` + redirect hint. **Never return multiplier values — only dollar totals.** Unit-test `quote_total === captured_total` across a base×tier matrix, and the cutoff at DST boundaries + near local midnight.

### Task 2: Capacity system
**Spec Reference:** §2.2 (capacity, R-14/R-15/R-16), §1.3 (soft-hold job, R-17)
**Creates:** capacity module, soft-hold expiry job
Slot reservation via `INSERT ... ON CONFLICT (day,slot) DO UPDATE ... WHERE soft_hold_expires_at < now()` (R-16, reclaims expired tentative holds inline). Upsert `capacity_days` first (R-14). Weather-block check via `SELECT ... FOR UPDATE` on the day row in the same txn as the slot insert (R-15). The soft-hold expiry job (every 15 min) is wrapped in a `pg_try_advisory_lock` (R-17) and, for a tentative hold on an `authorized` order, transitions to `needs_reslot` rather than silent release — but note: `authorized` orders don't exist until Phase 05, so this phase just implements the job correctly; it will have nothing to expire yet.

### Task 3: BIN checkout — reserve-then-charge
**Spec Reference:** §3.2 (/orders/bin, R-01), §5.1
**Creates:** `POST /api/v1/orders/bin`, Stripe capture integration
Implement EXACTLY the reserve-then-charge sequence in §3.2: (1) short Txn — re-quote server-side, upsert day, insert slot with inline-expiry + weather-block checks, create `pending_payment` order, COMMIT; (2) Stripe capture OUTSIDE any txn with the `Idempotency-Key`; (3) success → `captured`; (4) failure/timeout → compensating slot release + webhook reconciliation. `Idempotency-Key` is REQUIRED (R-09) and dedupes order creation server-side so a mobile double-tap returns the original order. `policy_acknowledged` must be true.

### Task 4: Stump grinding BIN item
**Spec Reference:** §3.2, F-008
**Creates:** stump-grinding config + configurator
Diameter × count pricing via the Task 1 engine. Measurement-diagram guidance in the UI ("measure at base/root flare, not top cut"). NO on-site upward adjustment — if actual diameter would exceed the booked tier, that's an over-tier case routed to the estimate flow (Phase 05); for this phase, the booked/paid tier is the scope.

### Task 5: Guest lookup — no enumeration oracle
**Spec Reference:** §3.2 (/orders/lookup, R-12/R-16), §3.1
**Creates:** `GET /api/v1/orders/lookup`
Requires `order_number` + `email`. Returns an **identical 404 with identical message in roughly constant time** for both "no such order" and "email mismatch" (R-16). Rate-limited 5/min keyed on the true client IP (R-12). No automated recovery — the lost-credential page instructs the customer to call.

### Task 6: Admin dashboard
**Spec Reference:** §3.2 (admin dashboard), §4.1, F-015
**Creates:** `GET /api/v1/admin/dashboard`, dashboard UI
Today/tomorrow/week view: confirmed vs. tentative slots, a "Needs Slot Assignment" alert for any `needs_reslot` orders (will be empty until Phase 05), orders needing action, and customer name/phone search (uses the R-22 indexes). Admin-JWT protected.

### Task 7: Stripe webhook
**Spec Reference:** §3.3 (R-10)
**Creates:** `POST /api/v1/webhooks/stripe`
Verify signature against the raw body (routed direct-to-FastAPI per Phase 00). Dedup on event id via `processed_webhooks` (R-10). Handle `payment_intent.succeeded` to reconcile ambiguous BIN captures (R-01). (Full PI-correlation for re-auth voids is Phase 05 — implement the dedup + succeeded-reconciliation now.)

---

## 4. Acceptance Criteria

### Automated
- [ ] Unit: `quote_total === captured_total` across the base×tier matrix (R-07).
- [ ] Unit: 4pm cutoff correct across DST + near local-midnight (R-08).
- [ ] Integration: `/orders/bin` never opens a DB transaction spanning the Stripe call (R-01) — verify by code inspection + a test simulating Stripe latency/failure with correct compensation.
- [ ] Integration: duplicate `Idempotency-Key` on `/orders/bin` returns the original order, not a second (R-09).

### Functional
- [ ] **Concurrent-oversell test (O-004):** two simultaneous bookings for the last slot — exactly one succeeds (201), the other gets 409. MUST pass.
- [ ] Expired tentative hold does NOT cause a false 409 for a valid BIN booking (R-16). (Simulate by inserting an expired tentative row.)
- [ ] A weather-blocked half rejects new bookings (R-15).
- [ ] One real (test-mode) paid stump-grinding order completes end-to-end and lands `captured` with a reserved slot.
- [ ] `/orders/lookup` returns identical 404 for "no order" vs "wrong email" (R-12/R-16).
- [ ] Admin dashboard shows correct capacity state and supports name/phone search.

### Visual/UI
- [ ] Checkout renders at 375/768/1440; urgency-tier selector shows dollar totals per tier (never multipliers).

---

## 5. Constraints

### Hard (violation = phase failure)
- **R-01:** Stripe call is NEVER inside a DB transaction. Reserve-then-charge + compensation only.
- **O-004:** oversell impossible; the concurrent-booking test must pass.
- **R-07:** pinned multipliers, round-half-up once, one shared function; quote === charge.
- **R-08:** all date/cutoff math in America/New_York.
- **R-09:** `Idempotency-Key` required on `/orders/bin`.
- Pricing/capacity logic is server-side only — never trust a client-computed price.
- No tree-removal estimate, plant orders, authorize-confirm actions, or remaining BIN catalog — later phases.

### Soft (document deviations)
- Follow §3.2 response shapes exactly. Mark ambiguities `// SPEC-AMBIGUITY:`. The BIN-bumps-tentative full path depends on estimates (Phase 05); implement the slot-conflict handling and mark `// BLOCKED: full bump behavior needs tentative holds from Phase 05`.

---

## 6. Completion Protocol
Standard structured report. In **Acceptance Criteria Results**, explicitly show the concurrent-oversell test result and the reserve-then-charge failure-compensation test result. **Warnings for Next Phase:** Phase 05 will extend the webhook (PI-correlation), the bump behavior, and add `authorized`-order handling to the soft-hold job — note where those hooks are.

---

## 7. Execution & Orchestration

### Run Configuration
`claude --max-turns 100`. Very high — plan for 2-3 `--continue` cycles.

### Task Planning
1. Read §3.1/§3.2/§2.2/§5.1/§1.3 + the DANGER ZONE. 2. Pricing engine. 3. Capacity. 4. BIN checkout. 5. Stump item. 6. Lookup. 7. Dashboard. 8. Webhook.

### Resumption (--continue)
Re-read this prompt AND the DANGER ZONE, inspect existing modules, resume at the first incomplete task. Do NOT refactor completed money logic without cause.

### Autonomous Decision Authority
Spec defines it → follow exactly (this is the money core — no creative interpretation). Silent → `// SPEC-AMBIGUITY:`. Contradiction → `// ESCALATE:` and skip.

### Progress Tracking
Update `PHASE-03-PROGRESS.md` after each task.

**Human decision gate follows this phase** — the reviewer + human verify R-01, the O-004 concurrency test, R-07, R-08, and R-09 before anything else is built on the money core.
