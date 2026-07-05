# Phase 05: Authorize-Then-Confirm Flows ⚠️ MONEY CORE
**Project:** Hamptons Tree Experts Platform
**Spec:** `hamptons-tree-experts-spec-v2.md`
**Build Plan:** `hamptons-tree-experts-buildplan.md`
**Prerequisites:** Phase 03 complete
**Implements:** F-003, F-009, F-013, F-019, F-020
**Parallel with:** Phase 04 (no shared files)
**Recommended:** `claude --max-turns 100`

---

## 1. Context

You are executing **Phase 05: Authorize-Then-Confirm Flows** — tree-removal estimates, plant orders, the admin hold-management actions, photo handling, and the no-refund policy. **This is the second highest-risk phase.** It contains the estimate→order handoff, the two-clock reconciliation, the bump money/state transition, and the webhook correlation logic — all flagged CRITICAL in review. Follow the danger-zone warnings exactly.

**Your scope is strictly this phase.** Build the estimate tool, the plant authorize-confirm endpoint, the three Option B admin actions, photo storage/serving, and the F-020 policy. Do NOT modify the Phase 03 BIN checkout except to complete the BIN-bumps-tentative behavior (which needs the tentative holds this phase introduces).

**Tech Stack (spec §1.2):** FastAPI, Supabase/PostgreSQL, Stripe (standard auth holds, **NO SetupIntent / no stored payment method — Option B**), Next.js, VPS filesystem for photos.
**Working Directory:** project root.
**Spec File:** `hamptons-tree-experts-spec-v2.md` — READ §3.2 (/estimates, /orders/authorize-confirm, admin action, reschedule), §3.3 (webhook), §2.2 (estimates, orders status), §5.1, §7.3/§7.4 FIRST.

### What Already Exists
- Phase 00: Docker stack, `/var/hte/uploads` volume, Nginx (no static serving of uploads), timezone.
- Phase 01: schema incl. `estimates`, `estimate_photos`, `orders` (status incl. `needs_reslot`, `original_quote_cents`, active-PI tracking), `outbox_emails`.
- Phase 03: pricing engine, capacity system + soft-hold expiry job (advisory-locked), reserve-then-charge BIN checkout, guest lookup, admin dashboard, Stripe webhook (dedup + succeeded-reconcile). The BIN checkout has a slot-conflict path stubbed for bumping.

### What You're Building
The authorize-then-confirm half of the platform: fast non-binding tree-removal estimates and fixed-price plant orders that only capture after crew confirmation, managed through three manual admin actions, with hardened photo handling and a disclosed no-refund policy.

---

## ⚠️ DANGER ZONE — read before writing any code

- **R-01 (again):** the estimate and plant endpoints also reserve-then-charge — reserve the tentative slot in a short committed txn, THEN place the Stripe auth hold OUTSIDE any transaction, THEN set `authorized`; compensating slot release on auth failure. Never wrap Stripe in a DB transaction.
- **R-02 → Option B:** F-013 has exactly THREE actions — **Capture, Cancel, Extend-via-link**. There is NO Increase/Decrease. Off-session re-auth at a new amount is impossible without a stored payment method, which this project deliberately does not use. Price changes = Cancel + customer re-book.
- **R-03 — reconcile the two clocks.** The 48h soft-hold and the ~7-day Stripe auth run on different clocks. On soft-hold expiry of an order still `authorized`, transition to `needs_reslot` and surface it — do NOT silently release the slot. The **Capture action must re-assert the slot atomically** (`SELECT ... FOR UPDATE` on day+slot; if occupied by another order, REFUSE with 409) — this is the exact oversell-via-money-path the review caught.
- **R-04 — bump money/state fully defined.** When a BIN order bumps a tentative estimate: the bumped estimate keeps its live Stripe hold, moves to `needs_reslot`, the system attempts to auto-reflow it to the next slot and offers that concretely; only if none is available does it fall back to "pick a new date." Record old slot + retained PI id + money decision in `order_events` (`bumped_by_bin`).
- **R-05 — webhook correlates by active PI id + state.** A `payment_intent.canceled` event is acted on ONLY if its PI id matches the order's CURRENT active `stripe_payment_intent_id`. An Extend re-auth voids the old PI → its `canceled` event must be IGNORED, not read as a real cancel. State-level idempotency: processing the same target state twice is a no-op.
- **R-13 — F-020 disclosure is a blocking legal gate.** The no-refund disclosure requires an ACTIVE acknowledgment (`policy_acknowledged`), AND its wording must pass legal/consumer-protection review before this phase ships. Mark it `// BLOCKED: F-020 wording pending legal review` if not yet cleared.
- **R-11 — photos:** strip EXIF (re-encode via Pillow), magic-byte validation, generated UUID filenames, decompression-bomb guard, and serve ONLY through the JWT-authenticated admin endpoint. NEVER static-served.

---

## 2. Objective & Deliverables

### Objective
After this phase, a homeowner can submit a non-binding tree-removal estimate (photo + self-report → wide range → auth hold + tentative slot) or a fixed-price plant order, and the admin can Capture/Cancel/Extend each with correct money and slot behavior — with oversell impossible even via the money path.

### Deliverables
1. Tree-removal estimate tool — F-009, §3.2: `POST /estimates`, deterministic wide range (R-06), no urgency tier (R-34), acknowledgment required, reserve-then-charge auth hold at `range_high_cents`, tentative 48h soft-hold.
2. Plant authorize-confirm — F-003, §3.2: `POST /orders/authorize-confirm` (R-19) — fixed price, no range, no photos, stock-availability confirm.
3. F-013 admin actions (Option B) — §3.2: Capture (atomic slot re-assertion, R-03), Cancel (scoped delete, R-26), Extend (customer re-auth link, R-05); day-3 reminder.
4. Reschedule — F-020, §3.2: `POST /admin/orders/{id}/reschedule` with `{new_date,new_slot}` (R-28), same amount, tier-delta logging (R-24).
5. Photo storage + serving — F-019, §3.2/§7.3/§7.4: EXIF strip, auth'd serve endpoint, 90-day purge job (R-11/R-20).
6. Clock reconciliation — R-03: extend the Phase 03 soft-hold job to route `authorized` orders to `needs_reslot`.
7. BIN-bumps-tentative completion — R-04: finish the bump path stubbed in Phase 03.
8. Webhook PI-correlation — R-05: extend the Phase 03 webhook.
9. F-020 no-refund policy — §3.2, active acknowledgment (R-13).

---

## 3. Implementation Instructions

**Skills Reference (UI work):** `view /mnt/skills/public/frontend-design/SKILL.md` — the estimate uploader and admin hold panel must match the design system and be operable under stress (R-27).

### Task 1: Estimate range engine + tool
**Spec Reference:** §3.2 (/pricing/quote estimate mode R-06, /estimates), R-34
**Creates:** estimate range logic, `POST /estimates`, `EstimateUploader`
Extend `/pricing/quote` to estimate mode: deterministic `range_low/high` from self-report (height/access/distance) + fixed variance factor, kept deliberately wide (no deviation cap). Tree removal has NO urgency tier (R-34) — `urgency_tier` NULL, selector hidden. `POST /estimates` (multipart) requires `acknowledged:true` + `policy_acknowledged:true`, reserve-then-charge auth hold at `range_high_cents`, tentative 48h soft-hold. Disclaimer copy: "not a safety/hazard assessment," active hazards → phone CTA.

### Task 2: Photo handling
**Spec Reference:** §3.2, §7.3, §7.4, F-019 (R-11/R-20)
**Creates:** upload pipeline, auth'd serve endpoint, purge job
Magic-byte + type/size whitelist, Pillow re-encode to strip EXIF, decompression-bomb guard, UUID filenames under `/var/hte/uploads`. Serve ONLY via `GET /api/v1/admin/estimates/{id}/photos/{n}` (JWT-checked, streams from disk, missing file → "photo unavailable" not 500). Daily purge job (advisory-locked) deletes rows + files past `purge_after` (90d).

### Task 3: Plant authorize-confirm
**Spec Reference:** §3.2 (/orders/authorize-confirm, R-19)
**Creates:** `POST /orders/authorize-confirm`, plant configurator
Fixed configured price (NOT a range), no photos, stock-availability confirm instead of on-site price confirm. Reserve-then-charge auth hold at the fixed amount, tentative slot. Capture uses the configured price.

### Task 4: F-013 admin actions (Option B — three only)
**Spec Reference:** §3.2 (admin action, R-02/R-03/R-26), §5.1
**Creates:** `POST /admin/orders/{id}/action`, `HoldActionPanel`
- **Capture:** atomic slot re-assertion first (`SELECT FOR UPDATE` on day+slot; if occupied by a different order → 409, R-03); then Stripe capture, `captured`, tentative→confirmed.
- **Cancel:** void active PI; scoped delete `WHERE order_id={id}` (R-26); `cancelled`.
- **Extend:** email a re-auth link via outbox (customer completes a fresh same-amount hold; new PI becomes active, R-05). NOT a backend off-session charge.
- NO Increase/Decrease (Option B). `HoldActionPanel` has loading/confirm/toast/inline-help states (R-27). Every action writes `order_events` with prior/active PI id (R-05).

### Task 5: Reschedule + F-020
**Spec Reference:** §3.2 (reschedule R-28/R-24), F-020 (R-13)
**Creates:** `POST /admin/orders/{id}/reschedule`, `PolicyDisclosure`
Reschedule takes `{new_date,new_slot}`, keeps the same amount (no Stripe change), logs tier-delta in `order_events.detail` (R-24), flags premium-moved-to-lower on the dashboard. `PolicyDisclosure` is an ACTIVE acknowledgment checkbox (R-13) setting `policy_acknowledged`; block checkout without it. Mark `// BLOCKED: F-020 wording pending legal review` until cleared.

### Task 6: Clock reconciliation, bump completion, webhook correlation
**Spec Reference:** §1.3 (soft-hold job R-03), §3.2 (bump R-04), §3.3 (webhook R-05)
**Creates:** updates to the Phase 03 soft-hold job, BIN bump path, and webhook
Soft-hold expiry on an `authorized` order → `needs_reslot` (not silent release), surfaced on dashboard. Complete the BIN-bumps-tentative path: retain hold, `needs_reslot`, auto-reflow attempt + concrete offer, `bumped_by_bin` event. Webhook: ignore `payment_intent.canceled` for any PI id that isn't the order's current active PI (R-05); state-level idempotency.

---

## 4. Acceptance Criteria

### Automated
- [ ] Unit: estimate range is deterministic for identical inputs (R-06).
- [ ] Integration: estimate/plant endpoints reserve-then-charge (no Stripe-in-transaction, R-01).
- [ ] Integration: Extend voids old PI; a stale `canceled` webhook for the old PI id is IGNORED, order stays authorized (R-05).

### Functional
- [ ] **Oversell-via-money-path test (R-03):** estimate → 48h soft-hold expiry → slot rebooked by a BIN order → manager Capture on the original estimate is REFUSED with 409, no oversell. MUST pass.
- [ ] Estimate submission places an auth hold + tentative 48h slot; no capture until crew confirm.
- [ ] Plant order uses fixed price + stock confirm (R-19), no range/photos.
- [ ] Three admin actions work; NO Increase/Decrease exists (Option B).
- [ ] BIN bumps a tentative estimate → estimate `needs_reslot`, hold retained, concrete new slot offered (R-04).
- [ ] Reschedule keeps amount, logs tier delta (R-24).
- [ ] Photos strip EXIF, serve only via the auth'd endpoint, purge at 90d (R-11/R-20).
- [ ] Checkout blocked without active F-020 acknowledgment (R-13).

### Visual/UI
- [ ] EstimateUploader + HoldActionPanel render at 375/768/1440; hold panel has loading/confirm/feedback (R-27).

---

## 5. Constraints

### Hard (violation = phase failure)
- **R-01:** reserve-then-charge; never Stripe-in-transaction.
- **R-02/Option B:** three actions only; no Increase/Decrease; no stored payment method / no SetupIntent.
- **R-03:** Capture re-asserts slot atomically; soft-hold expiry → `needs_reslot`, never silent release.
- **R-04:** bump retains hold + defines state; no orphaned holds.
- **R-05:** webhook correlates by active PI id + state.
- **R-11:** EXIF stripped, photos never static-served.
- **R-13:** active acknowledgment + legal-review gate on F-020.
- Do NOT weaken the Phase 03 BIN core; only complete the bump path.

### Soft (document deviations)
- Follow §3.2 shapes exactly. Mark ambiguities `// SPEC-AMBIGUITY:`. F-020 wording not yet legal-reviewed → `// BLOCKED:`.

---

## 6. Completion Protocol
Standard structured report. In **Acceptance Criteria Results**, explicitly show the oversell-via-money-path (R-03) and reauth-void-not-cancel (R-05) test results. Flag the F-020 legal-review status. **Warnings for Next Phase:** Phase 06 must E2E-test all money-core paths built here.

---

## 7. Execution & Orchestration

### Run Configuration
`claude --max-turns 100`. Very high — plan for 2-3 `--continue` cycles.

### Task Planning
1. Read §3.2/§3.3/§2.2/§5.1/§7.3-7.4 + DANGER ZONE. 2. Estimate engine/tool. 3. Photos. 4. Plants. 5. Admin actions. 6. Reschedule/F-020. 7. Reconciliation/bump/webhook.

### Resumption (--continue)
Re-read this prompt AND the DANGER ZONE, inspect existing modules, resume at the first incomplete task. Do NOT refactor completed money logic without cause.

### Autonomous Decision Authority
Spec defines it → follow exactly (money core). Silent → `// SPEC-AMBIGUITY:`. Contradiction → `// ESCALATE:` and skip.

### Progress Tracking
Update `PHASE-05-PROGRESS.md` after each task.

**Human decision gate follows this phase** — reviewer + human verify R-01/R-03/R-04/R-05 and the Option B action set before deployment.
