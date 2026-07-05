# Phase 08: Visual/UX Validation via Claude in Chrome
**Project:** Hamptons Tree Experts Platform
**Spec:** `hamptons-tree-experts-spec-v2.md`
**Prerequisites:** Phase 07 deployed (staging or production)
**Implements:** F-017 UX validation (spec §9.4)

---

## This phase is executed by the HUMAN using Claude in Chrome — not by Claude Code.

Unlike Phases 00–07, this is not an autonomous build prompt. It is a validation protocol you run yourself, using Claude in Chrome against the deployed app, after Phase 06 tests pass and Phase 07 has deployed. It catches the visual/UX issues automated tests miss — especially the ones that matter for this brand's estate-grade positioning and the storm-urgent mobile persona.

---

## Validation Checklist

For each page/flow below: open it in Chrome with Claude in Chrome active, and ask Claude to evaluate layout rendering, responsive behavior, accessibility (focus states, contrast per the F-017 tokens), form validation UX, and error/empty/loading states. Document findings and triage: fix now / backlog / acceptable.

### Run at each breakpoint: 375px (mobile), 768px (tablet), 1440px (desktop)

**Brand / design system (F-017):**
- [ ] The palette reads as estate-grade (deep evergreen / bark / sand), NOT a generic contractor template.
- [ ] Rust-orange appears ONLY on urgency-tier pricing and primary CTAs — nowhere else.
- [ ] The urgency-tier selector (the signature element) is a clear visual centerpiece on service pages, showing dollar totals per tier — never raw multipliers.
- [ ] Price numerals use the monospace face; type hierarchy (serif display / grotesk body) is consistent.

**Storm-urgent mobile persona (the highest-value, worst-conditions user):**
- [ ] The Emergency/Storm page and the estimate flow are fully usable at 375px.
- [ ] The estimate photo upload works on mobile; the non-binding acknowledgment checkbox is unmissable.
- [ ] Checkout is completable one-handed on a small screen; nothing critical is below an awkward fold.

**Conversion + trust:**
- [ ] Town pages read as genuinely local (real references, real photos — no stock, no boilerplate).
- [ ] Permit pages show only verified content (no Manorville page if jurisdiction unconfirmed).
- [ ] The F-020 no-refund disclosure is clearly presented and requires an active acknowledgment before checkout.

**States (per spec §9.4):**
- [ ] Empty states (e.g., no availability / fully booked) give direction, not a dead end.
- [ ] Error states (payment declined, slot taken 409, bounds exceeded) show the spec §8.1 messages in the interface's voice.
- [ ] Loading states on pricing/availability and the admin hold-action panel are present and clear.

**Admin under stress:**
- [ ] The hold-action panel's three actions (Capture / Cancel / Extend) have obvious loading + confirmation + feedback (R-27) — a manager during a storm surge can't be guessing.

---

## When to Run
- After Phase 06 tests pass AND Phase 07 has deployed to staging (or production behind a check).
- On the key journeys from spec §9.3.
- At all three breakpoints.

## Output
Document findings in a short report; triage each into fix-now / backlog / acceptable. Fix-now items loop back to the relevant phase's builder (or a targeted fix session). This is the last gate before considering the launch UX-complete.
