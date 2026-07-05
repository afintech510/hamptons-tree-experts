# Phase 01: Schema & Admin Auth Foundation
**Project:** Hamptons Tree Experts Platform
**Spec:** `hamptons-tree-experts-spec-v2.md`
**Build Plan:** `hamptons-tree-experts-buildplan.md`
**Prerequisites:** Phase 00 complete
**Implements:** Data model for all features; admin authentication (F-015 foundation)
**Recommended:** `claude --max-turns 50`

---

## 1. Context

You are executing **Phase 01: Schema & Admin Auth Foundation** of the Hamptons Tree Experts build.

**Your scope is strictly this phase.** Build the complete database schema and the admin authentication system. Do NOT build any customer-facing pages, checkout, pricing, or capacity *logic* — only the tables and constraints that logic will later use.

**Tech Stack (spec §1.2):** Next.js, FastAPI, Supabase/PostgreSQL, Stripe. Supabase Auth for the single admin (no customer accounts — guest checkout).
**Working Directory:** project root from Phase 00.
**Spec File:** `hamptons-tree-experts-spec-v2.md` — READ §2 (all), §7 (all), §3.1 FIRST. Source of truth.

### What Already Exists
- Phase 00 created: Docker Compose stack (`web`/`api`/`nginx`), `.env.example`, `America/New_York` timezone config, Nginx money-route-direct + no-static-uploads posture, design tokens, and the `/var/hte/uploads` volume.

### What You're Building
Every table in spec §2.2 with exact columns/types/constraints/indexes, the order-status state machine, seed data, and Supabase admin auth with a forced-password-change + MFA bootstrap. After this phase the data model can support all 20 launch features and the admin can log in.

---

## 2. Objective & Deliverables

### Objective
After this phase, the full schema exists (with the O-004 capacity invariant and integer-cents money discipline enforced structurally), the order-status transition rules are codified and unit-tested, and the single admin can authenticate.

### Deliverables
1. Migrations for all tables in §2.2: `service_types`, `orders`, `capacity_days`, `capacity_slots`, `estimates`, `estimate_photos`, `townships`, `towns`, `order_events`, `admin_users`, `processed_webhooks`, `outbox_emails`, `job_runs`.
2. The `UNIQUE (day, slot)` constraint on `capacity_slots` — spec §2.2 (this is the O-004 oversell guarantee).
3. All indexes in §2.2, including `idx_orders_customer_phone` and `idx_orders_customer_name` (R-22), and the partial indexes.
4. Order-status state machine: enum + a transition function that rejects invalid transitions, with unit tests — spec §2.2 (R-21). Must include `needs_reslot`.
5. High-entropy `order_number` generator — §2.2 (R-12): service prefix + 10 random base32 chars, non-sequential.
6. Seed data — §2.4: 8 service types with `fulfillment_type` + `pricing_model`; 3 townships (`verified=false`); 6 towns mapped to townships; one bootstrap admin.
7. Supabase admin auth — §7.1: single admin, created via the Supabase admin API with forced password change on first login and MFA enabled.
8. Money columns are `integer` cents everywhere; no float/numeric for currency — §2.3. `original_quote_cents` is write-once (R-23).

---

## 3. Implementation Instructions

### Task 1: Core catalog + order tables
**Spec Reference:** §2.2 (`service_types`, `orders`)
**Creates:** migration files
Implement `service_types` and `orders` exactly per §2.2. `orders` includes `original_quote_cents` (write-once, R-23), `policy_acknowledged` (R-13), `stripe_payment_intent_id` as the *currently active* PI (R-05), and the high-entropy `order_number` (R-12). Money is integer cents; add a code comment enforcing "no float for currency."

### Task 2: Capacity tables + the O-004 invariant
**Spec Reference:** §2.2 (`capacity_days`, `capacity_slots`)
**Creates:** migration files
Implement both tables. **The `UNIQUE (day, slot)` constraint is the single most important line in this phase** — it makes oversell structurally impossible regardless of service type. Add the partial index on `soft_hold_expires_at WHERE hold_type='tentative'`. Do NOT implement booking logic — only the schema and constraints. (The inline-expiry-on-conflict and weather-block enforcement patterns from §2.2 are Phase 03's job; just ensure the columns exist to support them.)

### Task 3: Estimate, township, event, and infrastructure tables
**Spec Reference:** §2.2 (`estimates`, `estimate_photos`, `townships`, `towns`, `order_events`, `processed_webhooks`, `outbox_emails`, `job_runs`)
**Creates:** migration files
Implement all remaining tables per §2.2. `townships.verified` defaults false (R-29 publish gate); `towns` includes the `jurisdiction_note` for Manorville (N2). `processed_webhooks` (R-10), `outbox_emails` (R-08-email), and `job_runs` (R-31) are new infrastructure tables — implement their columns as described in §2.2.

### Task 4: Order-status state machine
**Spec Reference:** §2.2 (Status state machine, R-21/R-03/R-04)
**Creates:** `api/.../order_status.py` (or equivalent) + unit tests
Implement the status enum (`pending_payment`, `authorized`, `captured`, `confirmed_scheduled`, `needs_reslot`, `rescheduled`, `cancelled`, `completed`, `expired`) and a transition function encoding the valid transitions from §2.2. Invalid transitions must raise. Unit-test the valid and invalid transitions, especially `authorized → needs_reslot → (confirmed_scheduled | cancelled)`.

### Task 5: Seed data + high-entropy order numbers
**Spec Reference:** §2.4, §2.2 (R-12)
**Creates:** seed script, order-number generator
Seed the 8 service types with correct `fulfillment_type` (mulch/weed/topsoil/yard-cleanup/stump = `bin_immediate`; plants = `authorize_confirm`; tree-removal = `estimate`) and `pricing_model`. Seed 3 townships (`verified=false`) and 6 towns mapped per §2.2 (Westhampton/Speonk/Remsenburg/Quogue → Southampton; Riverhead → Riverhead; Manorville → Brookhaven with jurisdiction_note). Implement and unit-test the non-sequential order-number generator.

### Task 6: Admin auth
**Spec Reference:** §7.1, §7.2, §2.2 (`admin_users`)
**Creates:** auth middleware, bootstrap script
Supabase Auth for the single admin. Bootstrap via the Supabase admin API reading credentials from env, forcing a password change on first login, MFA enabled (R-13-adjacent). Implement JWT-validation middleware for `/api/v1/admin/*` (the admin endpoints themselves come in later phases — just the middleware + a protected `/api/v1/admin/ping` to prove it works).

---

## 4. Acceptance Criteria

### Automated
- [ ] Migrations run cleanly; all 13 tables exist with columns/types/constraints matching §2.2 exactly.
- [ ] `UNIQUE (day, slot)` present on `capacity_slots`.
- [ ] All money columns are `integer`; no float/numeric currency columns exist.
- [ ] Unit tests for the status transition function pass (valid transitions allowed, invalid raise).
- [ ] Order-number generator produces non-sequential high-entropy IDs (tested).
- [ ] Seed script loads without errors.

### Functional
- [ ] FK relationships match the §2.1 ER diagram.
- [ ] `townships.verified` defaults to false; Manorville carries a jurisdiction_note.
- [ ] `original_quote_cents` cannot be updated after creation (write-once enforced or documented).
- [ ] Admin can authenticate; `/api/v1/admin/ping` returns 401 without token, 200 with a valid admin JWT.
- [ ] Bootstrap forces password change on first login; MFA is enabled.

---

## 5. Constraints

### Hard (violation = phase failure)
- Column names, types, constraints, indexes MUST match spec §2.2 exactly.
- `UNIQUE (day, slot)` must exist — it is the O-004 guarantee.
- Money is integer cents everywhere; no float/numeric for currency (§2.3).
- Status enum must include `needs_reslot` (R-03/R-04) — do not omit it as "unused"; Phase 05 depends on it.
- No customer auth. No booking/pricing/checkout logic. Schema + admin auth only.

### Soft (document deviations)
- Use Supabase migrations (§2.3). Mark ambiguities `// SPEC-AMBIGUITY:`.

---

## 6. Completion Protocol
Standard structured report. **Warnings for Next Phase** must include: the exact table/column names Phase 02 (townships/towns for SSG) and Phase 03 (orders/capacity_slots/service_types) will consume, the status enum values, and confirmation the `UNIQUE(day,slot)` invariant is live.

---

## 7. Execution & Orchestration

### Run Configuration
`claude --max-turns 50`. Medium — may need one `--continue`.

### Task Planning
1. Read §2, §7, §3.1. 2. Core tables. 3. Capacity + invariant. 4. Remaining tables. 5. State machine. 6. Seed + order numbers. 7. Admin auth.

### Resumption (--continue)
Re-read this prompt, inspect existing migrations/code, resume at the first incomplete task, do not re-run completed migrations.

### Autonomous Decision Authority
Spec defines it → follow exactly (schema fidelity is critical this phase). Spec silent → mark `// SPEC-AMBIGUITY:`. Contradiction → `// ESCALATE:` and skip.

### Progress Tracking
Update `PHASE-01-PROGRESS.md` after each task.

**Human decision gate follows this phase** — schema errors cascade into every later phase, so the reviewer + human will scrutinize the invariant, money columns, and status machine before Phase 02/03 begin.
