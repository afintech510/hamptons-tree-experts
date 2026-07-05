# Phase 02: Marketing & Local-Authority Site
**Project:** Hamptons Tree Experts Platform
**Spec:** `hamptons-tree-experts-spec-v2.md`
**Build Plan:** `hamptons-tree-experts-buildplan.md`
**Prerequisites:** Phase 01 complete
**Implements:** F-001, F-002, F-016, F-017, F-018
**Parallel with:** Phase 03 (no shared files — can run in a separate terminal)
**Recommended:** `claude --max-turns 50`

---

## 1. Context

You are executing **Phase 02: Marketing & Local-Authority Site** — the public, SEO-driven, lead-generating site. This is SOW Phase 1 and the fastest path to lead volume; it does NOT depend on the checkout engine (Phase 03), so it can be built in parallel.

**Your scope is strictly this phase.** Build the public marketing/service/town/permit/emergency pages, the design system, SEO + analytics, and a simple lead-capture form with a manual capacity-pause toggle. Do NOT build checkout, pricing calculators, capacity logic, or the admin dashboard — those are Phase 03.

**Tech Stack (spec §1.2):** Next.js App Router (SSG for marketing/SEO pages), design tokens from Phase 00.
**Working Directory:** project root.
**Spec File:** `hamptons-tree-experts-spec-v2.md` — READ §4.1, §4.2, §1.2 (analytics), §2.2 (`townships`/`towns`) FIRST.

### What Already Exists
- Phase 00: Docker stack, design tokens (`design-tokens`), timezone, Nginx posture.
- Phase 01: full schema incl. `townships` (with `verified` flag) and `towns` (with township mapping + Manorville jurisdiction_note); admin auth.

### What You're Building
Static, fast, genuinely-local pages that rank — service pages, a dedicated emergency/storm page, non-templated town pages, a township permit hub gated on verified content, all styled with the estate-grade design system and wired for SEO + conversion analytics.

---

## 2. Objective & Deliverables

### Objective
After this phase, HamptonsTreeExperts.com is live and indexable with genuinely local content, an estate-grade look, permit pages that only publish verified content, and a working lead-capture form the crew can pause manually.

### Deliverables
1. Core service pages + a dedicated Emergency/Storm Response page — F-001, §4.1.
2. Priority town landing pages meeting the testable local-content standard — F-002, §4.1 (each page: ≥3 specific local references that can't survive a town-name find-and-replace, plus a link to its governing township permit page).
3. Township permit hub — F-016, §2.2 (**`generateStaticParams` filters `verified=true`** — R-29).
4. Design system implementation across all pages — F-017, §4.2 (consume Phase 00 tokens; the urgency-tier selector's *visual language* is defined here even though the functional selector is Phase 03).
5. Technical SEO + analytics — F-018, §1.2/§5.2: LocalBusiness + Service schema, unique meta titles/descriptions, sitemap, GA4 + Google Ads conversion events (lead-form submit fires here; checkout/estimate events are Phase 03/05).
6. Lead-capture form + manual capacity-pause toggle (admin-flippable "we're booked this week" state).

---

## 3. Implementation Instructions

**Skills Reference (read before ANY UI work):** `view /mnt/skills/public/frontend-design/SKILL.md`. This site's entire competitive edge is a distinctive, non-templated, estate-grade look — avoid the generic contractor-site defaults. Derive every color/type decision from the Phase 00 design tokens.

### Task 1: Design system + layout shell
**Spec Reference:** §4.2, §4.3, F-017
**Creates:** root layout, shared UI primitives, `PriceDisplay` visual style (monospace numerals)
Implement the layout shell and shared components consuming the Phase 00 tokens. Rust-orange reserved for CTAs only. Establish the type scale (serif display / grotesk body / monospace price).

### Task 2: Service pages + emergency page
**Spec Reference:** §4.1, F-001
**Creates:** `services/[slug]/page.tsx`, `emergency/page.tsx`
One page per core service, each with unique copy, a clear CTA into the (future) booking flow, and Service schema. The Emergency/Storm Response page is a first-class Phase 1 page (the storm-urgent persona's landing target), not deferred.

### Task 3: Town landing pages — non-templated
**Spec Reference:** §4.1, F-002
**Creates:** `areas/[town]/page.tsx`
Each town page MUST include ≥3 specific local references (named neighborhoods/roads, locally common tree species, a real local job reference or landmark) that could not survive a find-and-replace of the town name. Each links to its governing township permit page. This is the anti-thin-content standard — treat lightly-reworded boilerplate as a failure.

### Task 4: Permit hub with verified gate
**Spec Reference:** §2.2 (R-29), F-016
**Creates:** `permits/[township]/page.tsx`
SSG the permit pages, but **`generateStaticParams` MUST filter `WHERE verified = true`** — unverified township content (e.g., Manorville/Brookhaven pending jurisdiction confirmation) is never generated or published. Each permit page cites actual town code from the `townships.permit_content` field.

### Task 5: SEO + analytics
**Spec Reference:** §1.2, §5.2, F-018
**Creates:** schema components, sitemap, analytics wiring
LocalBusiness + Service schema (validate in Rich Results Test), unique meta per page, sitemap. GA4 + Google Ads: fire a conversion event on lead-form submission. Analytics is fire-and-forget — never block rendering.

### Task 6: Lead form + manual pause
**Spec Reference:** SOW Phase 1, F-011 (manual pause precursor)
**Creates:** lead-capture form + an admin-flippable pause flag
A simple contact/lead form (name, phone, email, service interest, message) that writes a lead record. Include a manual capacity-pause toggle the admin can flip to show "we're currently booked to capacity this week" — this protects the single crew before the automated Phase 03 capacity system exists.

---

## 4. Acceptance Criteria

### Automated
- [ ] `npm run build` succeeds; SSG generates service/town/permit/emergency pages.
- [ ] Permit `generateStaticParams` filters `verified=true` — a `verified=false` township produces NO page (test with Manorville).
- [ ] Schema validates in Google's Rich Results Test.

### Functional
- [ ] Each town page has ≥3 non-transferable local references and a working link to its correct township permit page.
- [ ] Emergency/Storm page is live and reachable.
- [ ] Lead form submits and writes a record; GA4 + Google Ads conversion event fires.
- [ ] Manual capacity-pause toggle changes the public messaging.

### Visual/UI
- [ ] Pages render without console errors; estate-grade design tokens applied consistently.
- [ ] Rust-orange used only for CTAs.
- [ ] Responsive at 375 / 768 / 1440.

### Hard Gates (external — verify before considering the phase launch-ready)
- [ ] **Real crew/job photography present — no placeholders (R-33).**
- [ ] **Only verified permit content published (R-29).** Manorville withheld until jurisdiction confirmed (N2).

---

## 5. Constraints

### Hard (violation = phase failure)
- No checkout, pricing calculator, capacity logic, or admin dashboard — Phase 03.
- Permit pages publish ONLY `verified=true` content (R-29).
- Town pages must meet the non-templated local-content standard (F-002) — no city-name-swap boilerplate.
- Design derives from Phase 00 tokens; no generic contractor-template look.

### Soft (document deviations)
- Follow §4.1 routing. Mark ambiguities `// SPEC-AMBIGUITY:`. If real photos aren't available yet, mark `// BLOCKED: photography (external gate)` rather than shipping stock photos.

---

## 6. Completion Protocol
Standard structured report. **Warnings for Next Phase:** note the design-system component names and the booking-flow CTA hooks Phase 03 will attach checkout to.

---

## 7. Execution & Orchestration

### Run Configuration
`claude --max-turns 50`. Medium; may need one `--continue`.

### Resumption (--continue)
Re-read this prompt, inspect existing pages/components, resume at the first incomplete task.

### Autonomous Decision Authority
Spec defines it → follow. Silent → `// SPEC-AMBIGUITY:`. Missing external asset (photos/verified content) → `// BLOCKED:` and continue with other tasks.

### Progress Tracking
Update `PHASE-02-PROGRESS.md` after each task.
