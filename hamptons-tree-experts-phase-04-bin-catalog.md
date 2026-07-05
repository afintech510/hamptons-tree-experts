# Phase 04: Full BIN Catalog
**Project:** Hamptons Tree Experts Platform
**Spec:** `hamptons-tree-experts-spec-v2.md`
**Build Plan:** `hamptons-tree-experts-buildplan.md`
**Prerequisites:** Phase 03 complete
**Implements:** F-004, F-005, F-006, F-007
**Parallel with:** Phase 05 (no shared files)
**Recommended:** `claude --max-turns 50`

---

## 1. Context

You are executing **Phase 04: Full BIN Catalog** — adding the remaining Buy-It-Now services on top of the checkout/pricing/capacity engine built in Phase 03.

**Your scope is strictly this phase.** Add mulching, weed block fabric, topsoil+reseeding, and bounded yard cleanup as BIN services. Do NOT modify the core checkout/pricing/capacity engine except to register new services and their pricing configs. Do NOT touch the tree-removal estimate or plant flows (Phase 05).

**Tech Stack (spec §1.2):** reuses the Phase 03 FastAPI pricing/capacity engine and Next.js checkout UI.
**Working Directory:** project root.
**Spec File:** `hamptons-tree-experts-spec-v2.md` — READ §3.2 (/pricing/quote, /orders/bin, bounds), §8.1 (error taxonomy) FIRST.

### What Already Exists
- Phase 03: the pricing engine (pinned multipliers, round-half-up-once), the 2-slot capacity system, reserve-then-charge BIN checkout (`/orders/bin`), guest lookup, admin dashboard, Stripe webhook, and ONE BIN item (stump grinding) proving the pattern end-to-end.

### What You're Building
Four more BIN services registered against the existing engine, each with its own pricing config and configurator UI, plus the bounds enforcement that redirects over-scope yard cleanup to the estimate flow.

---

## 2. Objective & Deliverables

### Objective
After this phase, all bounded BIN services (mulch, weed block, topsoil+reseed, yard cleanup) are purchasable online through the existing capacity-checked, reserve-then-charge checkout.

### Deliverables
1. Mulching — F-004, §3.2: cubic-yard quantity pricing.
2. Weed block fabric — F-005, §3.2: area (sq ft) pricing.
3. Topsoil + reseeding — F-006, §3.2: area/qty pricing.
4. Bounded yard cleanup — F-007, §3.2/§8.1: fixed-tier pricing with the **5 cu yd combined debris / 1-acre cap**; over-bound jobs return `BOUNDS_EXCEEDED` and redirect to the estimate-request flow rather than selling as BIN.

---

## 3. Implementation Instructions

**Skills Reference (UI work):** `view /mnt/skills/public/frontend-design/SKILL.md` — the new configurators must match the estate-grade design system from Phases 00/02.

### Task 1: Register the three straightforward BIN services
**Spec Reference:** §3.2, F-004/F-005/F-006
**Creates:** service configs + configurator UIs for mulch, weed block, topsoil+reseed
Each reuses the Phase 03 pricing engine (pinned multipliers, round-half-up-once) and `/orders/bin` reserve-then-charge flow — you should NOT be writing new checkout or capacity logic, only new pricing configs and configurator components. Confirm each service's `pricing_model` (seeded in Phase 01) produces correct quotes.

### Task 2: Bounded yard cleanup
**Spec Reference:** §3.2, §8.1, F-007
**Creates:** yard-cleanup config + configurator with bounds enforcement
Fixed-tier pricing. Enforce the 5 cu yd combined-debris (brush/grass/fill) / 1-acre cap. When the customer's inputs exceed the cap, `/pricing/quote` returns `bounds_ok:false` and the UI shows the `BOUNDS_EXCEEDED` message (§8.1) with a redirect to the estimate-request flow — never sell an over-bound cleanup as BIN. (The estimate flow itself is Phase 05; for now the redirect can target the estimate route which may not be live yet — mark `// BLOCKED: estimate flow lands in Phase 05` if needed, but the bounds *rejection* must work now.)

### Task 3: Catalog integration
**Spec Reference:** §4.1
**Creates:** catalog/service listing updates
Ensure all BIN services (including Phase 03's stump grinding) appear correctly in the service listing and route into the shared configurator → checkout flow.

---

## 4. Acceptance Criteria

### Automated
- [ ] Each new service produces correct quotes via the shared pricing engine (unit-tested); quote === charge holds (R-07 regression check).
- [ ] Yard cleanup over 5 cu yd / 1 acre returns `bounds_ok:false` / `BOUNDS_EXCEEDED` and does NOT create a BIN order.

### Functional
- [ ] Each of mulch, weed block, topsoil+reseed completes a real (test-mode) capacity-checked reserve-then-charge order.
- [ ] Over-bound yard cleanup is redirected to the estimate flow, never sold as BIN.
- [ ] Concurrent-oversell protection (O-004) still holds with multiple service types competing for the same slot.

### Visual/UI
- [ ] New configurators match the design system; responsive at 375/768/1440.

---

## 5. Constraints

### Hard (violation = phase failure)
- Do NOT modify the Phase 03 reserve-then-charge (R-01), capacity invariant (O-004), or pricing (R-07) core — only register new services/configs against it.
- Yard cleanup MUST enforce the 5 cu yd / 1-acre bound and redirect over-scope to estimate (F-007).
- No tree-removal estimate, plant, or authorize-confirm work — Phase 05.

### Soft (document deviations)
- Reuse Phase 03 patterns exactly for consistency. Mark ambiguities `// SPEC-AMBIGUITY:`.

---

## 6. Completion Protocol
Standard structured report. **Warnings for Next Phase:** confirm the estimate-flow redirect target that Phase 05 must honor for over-bound yard cleanup.

---

## 7. Execution & Orchestration

### Run Configuration
`claude --max-turns 50`. Medium.

### Resumption (--continue)
Re-read this prompt, inspect existing service configs, resume at the first incomplete task.

### Autonomous Decision Authority
Spec defines it → follow. Silent → `// SPEC-AMBIGUITY:`. Blocked by the not-yet-built estimate flow → `// BLOCKED:` and ensure the bounds rejection still works.

### Progress Tracking
Update `PHASE-04-PROGRESS.md` after each task.
