# Statement of Work: Hamptons Tree Experts Platform
**Version:** 2.2
**Date:** July 1, 2026
**Prepared for:** Adam Larkin (Benchworks AI) / Redwood Tree Experts (dba Hamptons Tree Experts)
**Prepared by:** Benchworks AI — Spec Pipeline
**Changelog from v2.1:** Spec-review finding R-02 (Option B) — F-013 collapsed from five actions to three (Capture / Cancel / Extend-via-link). The Increase/Decrease re-auth actions are removed because an off-session re-authorization at a new amount is technically impossible without a stored payment method, and this project deliberately does not store payment methods (no SetupIntent). Price changes are now handled by Cancel + re-book. All other spec-review findings (R-01, R-03 through R-34) are applied at the spec level (v2), not the SOW.
**Changelog from v2.0 (in v2.1):** Applied 3 Tier-1 blocking fixes plus 4 Tier-2 should-fix items and 4 Tier-3 notes. Full v1→v2.0 history retained below.

---

## 1. Executive Summary

Hamptons Tree Experts is a standalone marketing and e-commerce platform for a tree service business operating across Westhampton and the East End of Long Island. The site solves two problems at once: it needs to rank organically against a fragmented but entrenched set of local competitors, and it needs to convert that traffic directly into paid, scheduled work — without adding staff.

The platform lets customers instantly purchase bounded, predictable services (mulch, weed block fabric, topsoil/reseeding, bounded yard cleanup, stump grinding) online at a premium "ease" price, with three urgency tiers (next-day, 2–5 days, 6–14 days) shown as real dollar amounts. Tree removal and plant purchases — both exposed to real-world scope/stock variability — instead get an authorize-then-confirm flow: a fast, non-binding estimate or order that only captures payment once the crew confirms it can actually be fulfilled as described. The whole system respects one hard operational constraint: there is exactly **one crew with two working slots per day (morning and afternoon)**, shared across every service type — the platform must actively protect against overselling that capacity, not just take every order.

This is a standalone build. It does not integrate with the existing Redwood Tree Experts / Carlos equipment-and-scheduling operation.

## 2. Project Objectives

| ID | Objective | Success Metric | Priority |
|----|-----------|----------------|----------|
| O-001 | Increase qualified lead/booking volume from organic and direct traffic | Booking form submissions + confirmed orders per week, tracked via Google Analytics + Google Ads conversion tracking from launch. **Baseline:** current phone/word-of-mouth volume (to be recorded pre-launch). **Target:** to be set once baseline is recorded, reviewed at week 4 and week 8. | MUST |
| O-002 | Monetize convenience/urgency directly rather than competing on lowest price | % of orders selecting "Tomorrow" or "2–5 day" tier vs. standard, **measured only among orders where that tier was actually available** (excludes cases suppressed by the 2-slot/day cap, so the metric reflects willingness-to-pay, not scarcity) | MUST |
| O-003 | Establish the SEO foundation to compete on the East End keyword set | Indexed town×service pages live; schema validated; permit content live at launch | MUST |
| O-004 | Never oversell the single crew's real daily capacity (2 shared slots/day, AM/PM, across all services) | Zero double-bookings past the 2-slot/day limit, verified across all service types combined, not per service type | MUST |
| O-005 | Avoid binding-price liability exposure on variable-scope tree removal and stock-dependent plant orders | 100% of tree removal and plant orders pass through crew/admin confirmation before capture | MUST |

## 3. Feature Set

### 3.1 Core Features (Must-Have)

| ID | Feature | Description | User Story | Acceptance Criteria |
|----|---------|-------------|------------|---------------------|
| F-001 | Core service marketing pages | Dedicated page per core service (removal, trimming, stump grinding, land clearing, storm cleanup, planting, brush removal, health inspection), **including a dedicated Emergency/Storm Response page promoted to Phase 1** | As a homeowner, I want a clear page for the exact service I need so I can act with confidence | Each service has a unique URL, unique copy, schema markup, and a clear CTA; the Emergency/Storm Response page is live at Phase 1 launch, not deferred |
| F-002 | Priority town landing pages | Dedicated page per priority town (Westhampton, Speonk, Remsenburg, Hampton Bays, Southampton, Quogue, Manorville, Riverhead) with genuine local content | As a local searcher, I want to see a company that clearly serves my town | **Testable standard (replaces subjective "unique copy"):** each town page must include at least 3 specific local references (named neighborhoods/roads, tree species common to that area, a local job reference or landmark) that cannot survive a find-and-replace of the town name, plus a link to its governing township's permit page (see F-016 mapping) |
| F-003 | Plants: type/size/qty selection, authorize-then-confirm | Customer selects plant type, size, quantity; payment is **authorized, not captured**, until crew confirms actual stock/wholesaler availability | As a homeowner, I want to order specific plants without the site selling me stock that isn't actually available | Order flow matches F-013's authorize/capture-on-confirm pattern; customer notified before capture; no instant/blind capture for plants |
| F-004 | Buy-It-Now: Mulching | Quantity-based (cubic yard) instant pricing and checkout | As a homeowner, I want mulch delivered/spread without a quote call | Price calculates from qty input; checkout completes with immediate capture |
| F-005 | Buy-It-Now: Weed block fabric | Area-based (sq ft) instant pricing and checkout | As a homeowner, I want weed block installed at a known price | Price calculates from area input; checkout completes with immediate capture |
| F-006 | Buy-It-Now: Topsoil + reseeding | Area/qty-based instant pricing and checkout | As a homeowner, I want topsoil and reseeding without an on-site quote | Price calculates from area/qty input; checkout completes with immediate capture |
| F-007 | Buy-It-Now: Yard cleanup (bounded) | Fixed-tier instant pricing, **explicitly bounded to a maximum of 5 cubic yards combined debris (brush, grass clippings, fill) on a property up to 1 acre** | As a homeowner, I want a fair, upfront price for a bounded cleanup job | Checkout enforces the 5 cu yd / 1-acre cap; jobs exceeding this are redirected to the estimate-request flow, not sold as BIN |
| F-008 | Buy-It-Now: Stump grinding | Diameter × stump count instant pricing and checkout | As a homeowner, I want stump grinding priced and booked instantly | Price calculates from diameter tiers × count; UI includes a measurement diagram showing "measure at the base/root flare, not the top cut." **No on-site upward price adjustment** — this is a guest checkout with no stored payment method, so there's no way to collect a difference after capture. If actual diameter materially exceeds the booked tier, the crew grinds to the booked/paid scope, or the overage is redirected to a separate estimate-request flow (F-009-style) rather than charged against the completed BIN order. |
| F-009 | Tree removal instant estimate tool | Photo upload + self-report fields produce a non-binding price *range*, with an explicit validity window and acknowledgment step before submission. **No price-deviation cap** — the range itself is kept deliberately wide, backed by clear disclaimer language rather than a rule capping how far the confirmed price can move. **Handoff to F-013:** submission (photo + self-report + acknowledgment checkbox) creates a pending order and triggers the Stripe authorization hold at the top of the quoted range in the same step — this is what F-013 means by "authorized at order time." | As a homeowner, I want a fast price range without a blind commitment | Tool returns a range, not a single price; estimate has a stated validity period (48 hours); customer must check "I understand this is a non-binding estimate — final price is confirmed on-site and may differ from this range" before submitting; submission triggers the authorization hold immediately, with no separate payment step for the customer; the tool's copy explicitly states it provides pricing only and is **not a safety or hazard assessment** — active hazards are directed to a phone-contact CTA |
| F-010 | Urgency-tier pricing engine | Applies Tomorrow (~1.75–2.25x), 2–5 day (~1.15–1.35x), 6–14 day (1.0x) multipliers; displays as dollar totals, not multipliers; **"Tomorrow" tier has a hard 4:00 PM daily cutoff**, after which it becomes unavailable and shifts to the next day | As a customer, I want to see exactly what waiting saves me, and not book a slot the crew can't realistically prep for | All three tier prices shown simultaneously; Tomorrow tier disabled after 4:00 PM daily; multiplier logic never shown to the customer |
| F-011 | Single shared-crew capacity system | **Exactly 2 slots per day (morning, afternoon), shared across ALL service types combined** — not counted separately per service. Every bookable job (BIN or confirmed estimate) draws from this one shared pool. Pending (unconfirmed) tree removal/plant estimates place a provisional, expiring soft-hold against the pool, visible to admin as "tentative." **Tentative holds expire automatically after 48 hours if the estimate isn't confirmed.** If a paying BIN order requests the only remaining slot on a day where a tentative hold exists, **the BIN order takes priority** — the tentative hold is bumped and that customer is notified their estimate needs a new date, since a confirmed sale outranks an unconfirmed one. | As the business owner, I want the site to stop selling slots I can't fulfill, across every service type at once, and never let an unconfirmed hold block a real sale | A day shows as fully booked once 2 slots (confirmed + tentative) are filled, regardless of service mix; tentative holds auto-expire at 48 hours; a BIN order can bump a tentative hold and triggers a reschedule notification to the bumped customer; admin dashboard shows tentative vs. confirmed separately; the same mechanism serves as the v1 manual weather-pause control — admin can block either slot on any day for weather, tracked as its own explicit capability, not an incidental side-effect of F-011 |
| F-012 | Stripe checkout — immediate capture | For true BIN items only (F-004–F-008): charge captured at checkout | As a customer, I want a simple, complete checkout for standard items | Payment captured immediately on order confirmation for BIN items only |
| F-013 | Stripe checkout — authorize/capture-on-confirm, admin-managed | For tree removal (F-009) and plants (F-003): payment **authorized** (standard Stripe auth hold, no stored payment method / no SetupIntent — confirmed decision) at order time, captured only after crew confirms scope/availability. **No automatic re-authorization.** The admin dashboard reminds the manager as the hold approaches expiration, with manual action buttons: **Capture** (lock in the job at the authorized amount), **Cancel** (release the hold, order does not proceed), and **Extend Hold** (scope unchanged, confirmation running long — sends the customer a re-authorization link to place a fresh hold at the same amount before the original lapses; not a pure backend action, since a plain auth hold has no stored card to re-charge off-session). **Price changes are handled by Cancel → customer re-books at the new price** — there is no in-place Increase/Decrease action, because an off-session re-auth at a new amount is technically impossible without a stored payment method, which this project deliberately does not use. | As the business owner, I want final control over capture/cancel/extend decisions without storing customer card credentials | System reminds the manager by **day 3 of the hold** (debit/some networks release faster than the ~7-day credit norm); the three actions (Capture / Cancel / Extend-via-link) are available on the order; no capture, cancellation, or extension happens without a manager action; a scope/price change is a Cancel + re-book, not an in-place amount edit |
| F-014 | Guest checkout + order lookup | No account/auth system required; order status lookup via email/order number. **Phase 2a recovery path is manual**: if email/order number is lost, the customer calls the business, and admin verifies identity and retrieves the order from the F-015 dashboard — no automated SMS/OTP recovery at launch, since Twilio/SMS (F-050) isn't built until Phase 5. *Automated SMS-based recovery is a Phase 5 enhancement contingent on F-050.* | As a customer, I want to book without creating an account, and not get stuck if I lose my confirmation | Full purchase flow completes without account creation; status retrievable via email lookup; lost-confirmation cases are resolved via a documented manual phone-verification procedure using the F-015 dashboard, not an automated flow |
| F-015 | Admin order & capacity dashboard | Single view for today/tomorrow/this week's confirmed and **tentative** jobs across the 2-slot/day shared pool | As the crew/dispatcher, I want one place to see real exposure, including pending estimates | Dashboard reflects real-time confirmed + tentative capacity state and all pending/confirmed orders |
| F-016 | Permit & regulatory content hub | Town-by-town real (sourced, not generic) tree removal permit/ordinance guidance, organized by **governing township** (Southampton, Riverhead, Brookhaven — **East Hampton dropped from Phase 1 scope; no current F-002 town falls under it, so sourcing it now would be wasted effort; add back only if an East Hampton landing page is added in Phase 4**), with each village/hamlet landing page (F-002) linking to its correct governing township's permit page | As a homeowner, I want to know the actual rules before I commit | Each town's permit page cites the actual town code; F-002 pages link to the correct township page (Westhampton/Speonk/Remsenburg/Quogue → Town of Southampton; Riverhead → Town of Riverhead); **Manorville's township assignment must be verified before publishing** — Manorville's jurisdiction is not cleanly single-township, and this page's entire value proposition is accuracy, so "Brookhaven" is a working assumption pending confirmation, not a verified fact |
| F-017 | Design system implementation | Palette, type system, and signature pricing-selector element per the approved design direction | As the business owner, I want a distinctive, estate-grade look, not a templated contractor site | Design tokens (color/type/layout, documented as a versioned reference — see Assets) implemented consistently; passes basic accessibility contrast checks |
| F-018 | Technical SEO & analytics foundation | LocalBusiness + Service schema, unique meta titles/descriptions, sitemap, mobile performance baseline, **Google Analytics + Google Ads conversion tracking wired to O-001/O-002** | As the business owner, I want the technical groundwork and measurement in place from day one | Schema validates in Google's Rich Results Test; Core Web Vitals pass on mobile; GA4 + Google Ads conversion events fire on lead form submission, BIN checkout, and estimate submission |
| F-019 | Photo storage for estimate uploads | Tree-removal and plant-order photos stored on the existing Hetzner VPS filesystem (not third-party object storage) | As the business owner, I want a simple storage approach without added infrastructure cost | Uploaded images are stored server-side with a stated retention period (recommend 90 days post-job, then purge); upload flow copy makes clear photos are used for pricing only, not a professional hazard assessment |
| F-020 | No-refund / reschedule-only fulfillment policy | If a paid premium order can't be fulfilled as scheduled (weather, crew emergency), the customer is **rescheduled to the next available slot at no price adjustment** — no refunds issued as standard policy. **Flagged for legal/consumer-protection review before Phase 2a ships** — the trigger cases are business-side non-performance (not customer cancellation), and a customer charged a premium urgency tier who's then rescheduled far out at the same price has real chargeback and NY consumer-protection disclosure exposure that checkout copy alone may not fully cover. This is a review-and-confirm-the-wording step, not a reversal of the no-refund decision. | As the business owner, I want to avoid refund/chargeback exposure while still treating the customer fairly | Order status supports a "Rescheduled — no charge change" state; checkout/confirmation copy discloses this policy upfront, with disclosure language reviewed before Phase 2a launch; admin can trigger a reschedule from the dashboard without touching the Stripe charge |

### 3.2 Enhancement Features (Nice-to-Have)

| ID | Feature | Description | Dependency | Deferred Until |
|----|---------|-------------|------------|----------------|
| F-050 | SMS order status notifications | Twilio-based updates ("crew confirmed for tomorrow AM slot") | F-011, F-015 | Phase 5 |
| F-051 | Automatic weather-based capacity pause | Weather API auto-blocks slots during active severe weather advisories (v1 ships with the manual toggle folded into F-011 instead) | F-011 | Phase 5 |
| F-052 | Cart bundle suggestions | "Add mulch to your stump grinding order" style upsell at checkout | F-004–F-008 | Phase 5 |
| F-053 | Repeat customer / property-based accounts | Order history tied to an address for returning customers | F-014 | Post-launch |
| F-054 | Blog / resource content hub | Question-based and seasonal SEO content beyond the Phase 1 Emergency/Storm page | F-018 | Phase 4, ongoing |

### 3.3 Explicitly Out of Scope

- Integration with Carlos's existing equipment/scheduling systems — fully standalone.
- Berm design/installation options.
- Multi-crew dispatch or routing logic — the capacity system is built for exactly one crew, two slots/day.
- Full customer account/authentication system — guest checkout + phone-verification recovery only at launch.
- Automatic weather-based pausing at launch (manual toggle via F-011 instead).
- Financing or installment payment plans.
- Custom/unscoped yard cleanup quoting — bounded to 5 cu yd / 1-acre tier only; anything larger routes to the estimate flow.
- **Third-party object storage (S3, etc.) for uploaded photos** — stored on existing VPS infrastructure per F-019.
- Reliance on unverified (Tier-3) competitor names from the competitive intelligence report in any customer-facing copy, SEO strategy, or positioning claim — Tier-1 verified competitors only.

## 4. Users & Personas

*(unchanged from v1 — see Storm-Urgent Homeowner, Planning Homeowner/BIN Shopper, Adam/Crew Dispatcher personas)*

## 5. Competitive & Design References

| Reference | URL/Source | What to Emulate | What to Avoid |
|-----------|-----|-----------------|---------------|
| Green Light Tree Services / Long Island Best Tree Service | Consolidated competitive intelligence report | Town×service page architecture at scale | Their templated, city-name-swap thin content |
| SavATree / Bartlett | Consolidated competitive intelligence report | Credibility signals (arborist bios, certifications) | Corporate/impersonal tone, weak transactional urgency |
| Consolidated Competitive Intelligence Synthesis | `Hamptons-Tree-Experts-Consolidated-Competitive-Intelligence.md` | Permit-content moat, non-templated local content | **Tier-3/unverified competitor claims — confirmed policy: do not use in any customer-facing copy or strategic positioning without independent verification** |
| Frontend Design Direction (Phase 1 preview) | This conversation — to be formalized as `hamptons-tree-experts-design-tokens-v1.md` | Deep evergreen/bark/sand palette, serif display + grotesk body, urgency-tier selector as visual centerpiece | Generic cream-serif, dark-mode-neon, or blue-and-white contractor templates |

**Note on estate/premium positioning:** this theme emerged independently across the model-generated competitive reports rather than the original live-search-verified pass. It's being adopted as brand direction since the domain and design direction are already committed, but should be treated as a working hypothesis to validate with real customer response post-launch, not an already-proven market fact.

## 6. Technical Constraints & Existing Infrastructure

### Existing Stack
- **Frontend:** Next.js
- **Backend:** FastAPI
- **Database:** Supabase (PostgreSQL)
- **Payments:** Stripe (standard authorization holds, not SetupIntents — confirmed decision)
- **File storage:** Existing Hetzner VPS filesystem (confirmed decision — no S3/object storage)
- **Hosting:** Hetzner VPS (5.161.88.134), Docker, Nginx
- **Domain:** HamptonsTreeExperts.com
- **Integrations:** Stripe (required); Google Analytics + Google Ads (Phase 1); Twilio (deferred, F-050); weather API (deferred, F-051)

### Constraints
- Must run on existing Hetzner VPS infrastructure.
- **Exactly one crew, two slots/day (AM/PM), shared across all service types** — this is the binding constraint for F-011, not a per-service-type limit.
- No integration with Carlos's systems.
- Launch ASAP — the business is already operating and needs lead volume now.

## 7. Assets & Materials

| Asset | Status | Location/Notes |
|-------|--------|----------------|
| Logo / Brand kit | Needed | New domain/brand |
| Design tokens reference | Needed | To be documented as `hamptons-tree-experts-design-tokens-v1.md` (palette hex values, type families, layout rules) before F-017 build begins |
| Copy / Content | Partial | Competitive intelligence and keyword strategy exist; town-specific and permit content still needs to be written/sourced |
| Photography / Media | Needed — **Phase 1 hard gate** | Real crew/job photos required before Phase 1 launch; no stock-photo fallback given the competitive trust-gap finding |
| Existing database / data | N/A | New build — confirm no legacy Redwood data needs migrating |
| Permit/ordinance source data | Needed | Southampton, East Hampton, Riverhead, Brookhaven town codes must be sourced and verified before F-016 publishes — **now a Phase 1 dependency**, not Phase 4 |

## 8. Delivery Phases & Timeline

### Phase 1: MVP Lead & Local-Authority Launch — Fastest Responsible Timeline
*(relabeled from "ASAP" — now gated on 4-township-to-3-township verified permit content and real photography, so this is the fastest path given the competitive strategy's requirements, not an instant launch)*
**Deliverables:**
- F-001 (core service pages + Emergency/Storm Response page)
- F-002 (priority town pages, testable local-content standard)
- F-016 (permit/regulatory content hub — moved up from Phase 4)
- F-017 (design system v1, tokens documented)
- F-018 (technical SEO + analytics foundation)
- Manual lead-capture/contact form with a manual capacity-pause toggle

**Milestone Criteria:** Site is live on HamptonsTreeExperts.com, indexed, permit content and town pages live, generating inbound leads via form/phone, with real photography (no placeholders).

### Phase 2a: Thin-Slice Checkout (validate the money path first)
**Deliverables:**
- F-011 (2-slot/day shared capacity system)
- F-010 (urgency-tier pricing engine, 4pm cutoff)
- F-012 (immediate-capture checkout)
- F-014 (guest checkout + phone-verification recovery)
- One BIN item live end-to-end (e.g., stump grinding, F-008)
- F-015 (admin dashboard)

**Milestone Criteria:** A customer can complete one real, paid, capacity-checked order end-to-end before the rest of the catalog goes live.

### Phase 2b: Full BIN Catalog
**Deliverables:**
- F-004, F-005, F-006, F-007 (remaining BIN catalog items)

**Milestone Criteria:** All bounded services are purchasable online.

### Phase 3: Authorize-Then-Confirm Flows
**Deliverables:**
- F-009 (tree removal estimate tool)
- F-003 (plant orders, authorize-then-confirm)
- F-013 (authorize/capture-on-confirm, auth-hold lapse handling)
- F-019 (photo storage)

**Milestone Criteria:** Tree removal and plant orders both produce non-binding outcomes that convert to confirmed, captured orders only after crew confirmation.

### Phase 4: SEO Content Build-Out
**Deliverables:**
- Remaining town×service page matrix
- F-054 (blog/resource hub, ongoing)

**Milestone Criteria:** Full keyword-target page set is live and indexed.

### Phase 5: Enhancements
**Deliverables:** F-050, F-051, F-052, F-053 — shipped incrementally post-launch based on real order volume.

## 9. Commercial Terms

Solo/indie build — Adam is both stakeholder and builder.

## 10. Assumptions & Dependencies

- Stripe account active before Phase 2a.
- Real job photography available before Phase 1 launch (hard gate — see Section 7).
- Town ordinance/permit information manually sourced and verified before Phase 1 (moved up from Phase 4 — see F-016).
- No existing Redwood Tree Experts customer/order data needs migrating (to be confirmed).
- No-refund/reschedule-only policy (F-020) will be clearly disclosed to customers at checkout — this is a customer-facing commitment, not just an internal ops rule, so checkout copy needs a tone/clarity pass before Phase 2a ships.

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Single crew oversold past 2-slot/day capacity | Low (post-fix) | High | F-011 shared-pool model, hard Phase 2a dependency |
| Tree removal estimate treated as binding, creating a dispute | Medium | High | F-009 non-binding messaging + acknowledgment step + F-013 confirm-before-capture; deviation risk accepted and covered by disclaimer language (no hard cap — confirmed decision) |
| Confirmed price significantly exceeds quoted estimate range | Medium | Medium | **Accepted risk** — mitigated by deliberately wide ranges + explicit "final price confirmed on-site, may differ" disclaimer, not a hard cap (confirmed decision) |
| Paid premium order can't be fulfilled (weather, crew emergency) | Medium | Medium | **F-020: no-refund, reschedule-at-same-price policy**, disclosed upfront at checkout — **flagged for legal/consumer-protection review before Phase 2a**; the no-refund decision stands, but disclosure wording needs confirmation given business-side-non-performance chargeback exposure |
| Stripe auth hold approaches expiration during storm-driven confirmation backlogs | Medium | Medium | **Manual, not automatic** — F-013 reminds the manager by day 3 with Capture / Cancel / Extend-via-link controls (Option B: no in-place Increase/Decrease, since no stored payment method exists; price changes are Cancel + re-book); no action taken without manager input |
| Storm-driven demand spikes overwhelm the one crew | Medium | Medium | Manual slot block-out via F-011 from day one |
| Permit content published with inaccurate town info | Low–Medium | Medium | F-016 requires sourced/verified data, now Phase 1 |
| "Launch ASAP" pressure rushes payment logic | Medium | High | Phase 1 ships with no checkout; Phase 2a is a deliberately thin, validated slice before the full catalog ships |

## 12. Sign-Off

By confirming this SOW, the stakeholder agrees that the scope, features, and phases described above accurately represent the intended project. All four previously open decisions (A-D) have been resolved and incorporated.

- [ ] **SOW v2.0 Confirmed** — Adam Larkin — [Date]

---

## Resolved Decisions (A-D)

**A. Stripe auth-hold management — fully manual.** No automatic re-authorization. The admin dashboard reminds the manager before the ~7-day hold expires, with one-click Capture, Cancel, Re-authorize (Increase), and Re-authorize (Decrease) controls. Applied to F-013.

**B. No-refund policy.** Refunds are avoided entirely as standard practice. Unfulfillable premium orders are rescheduled to the next available slot at the original price — no price adjustment, no refund. Applied as new feature F-020, disclosed at checkout.

**C. No price-deviation cap.** Tree removal pricing relies on deliberately wide ranges plus clear disclaimer language rather than a rule capping how far the confirmed price can move from the quote. Applied to F-009.

**D. Town-to-township permit mapping — applied.** Southampton township governs Westhampton, Speonk, Remsenburg, and Quogue landing pages; Brookhaven township governs Manorville. Each F-002 town page links to its correct F-016 permit page.

---

## Applied Changes Log (v1.0 → v2.0)

1. F-011 rebuilt as a single shared 2-slot/day (AM/PM) capacity pool instead of per-service-type counts — fixes the core oversell defect.
2. F-007 bounded to 5 cu yd combined debris / 1-acre property max.
3. F-003 (plants) converted to authorize-then-confirm.
4. F-010 given a hard 4:00 PM "Tomorrow" cutoff.
5. F-002 given a testable local-content standard (3+ non-transferable local references) and linked to F-016's township mapping.
6. F-016 (permit hub) and expanded F-001/F-002 moved from Phase 4 to Phase 1.
7. F-013 kept on standard Stripe auth holds (not SetupIntent) per your call, with fully manual, manager-driven hold management — no automatic re-authorization.
8. F-019 added: photo storage kept on existing VPS (not S3), with a retention policy and "pricing only, not a hazard assessment" disclaimer.
9. F-014 given a phone-verification recovery path.
10. F-018 expanded to include Google Analytics + Google Ads conversion tracking, tied to O-001/O-002.
11. F-017 tokens added as a tracked, versioned asset.
12. Tier-1-only competitor guardrail added to Section 5.
13. Phase 2 split into 2a (thin validated slice) and 2b (full catalog) to avoid a rushed mega-phase.
14. Phase names normalized across all sections.
15. O-001/O-002 given baseline/target-tracking language and a scarcity-corrected measurement definition.
16. Estate-positioning caveat added to Section 5 — noted as a working hypothesis, not a verified market fact.
17. Open Items A-D resolved: (A) Stripe hold management is fully manual — manager gets a reminder with Capture/Cancel/Re-authorize (increase or decrease) controls, no auto re-auth; (B) no-refund policy added as F-020 — unfulfillable premium orders reschedule at the same price, never refund; (C) no price-deviation cap — wide ranges + disclaimer only; (D) town-to-township permit mapping applied as specified.
18. **Pre-lock review — Tier 1 blocking fixes applied:** (B1) corrected the stale "auto re-authorization" language in item 7 above, which contradicted F-013/Resolved Decision A/the risk table — F-013 is fully manual, no auto re-auth, full stop; (B2) F-014's Phase 2a recovery path is now explicitly manual (phone call + admin dashboard lookup), since Twilio/SMS (F-050) doesn't exist until Phase 5 — automated SMS recovery is now correctly scoped as a Phase 5 dependency; (B3) removed F-008's unfunded on-site upward price adjustment — a guest BIN checkout has no stored payment method to collect a difference from, so overages now route to the estimate-request flow instead of an uncollectable on-site charge.
19. **v2.1 — Tier 2 should-fix items applied:** (S1) F-009 now explicitly defines the handoff to F-013 — estimate submission triggers the authorization hold in the same step; (S2) F-013 gained a fifth action, Re-authorize — Same Amount/Extend Hold, so an unchanged-scope confirmation running long doesn't force a premature capture or cancel; (S3) F-011's tentative soft-holds now expire at 48 hours, and a paying BIN order takes priority over — and can bump — an unconfirmed tentative hold; (S4) F-020 is flagged for legal/consumer-protection review before Phase 2a and its risk-table impact bumped from Low-Medium to Medium — the no-refund policy itself is unchanged, only the disclosure wording is under review.
20. **v2.1 — Tier 3 notes applied:** (N1) dropped East Hampton from F-016's Phase 1 township scope — no current F-002 page uses it; (N2) flagged Manorville's township assignment as needing verification rather than treating "Brookhaven" as settled fact; (N3) moved the F-013 manager reminder from day 4–5 to day 3 to account for faster-expiring debit/network holds; (N4) relabeled Phase 1 from "ASAP" to "Fastest Responsible Timeline," reflecting that it's now gated on verified permit content and real photography.
