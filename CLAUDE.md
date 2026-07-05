# CLAUDE.md — Hamptons Tree Experts Platform

Read this file first. It is the operating guide for every AI session working on this codebase.

## What This Is

Marketing and e-commerce platform for a one-crew tree service on Long Island's East End. Domain: HamptonsTreeExperts.com. Engagement by BenchworksAI (Adam Larkin).

## Stack

- **Frontend:** Next.js (App Router, `output: standalone`), React, TypeScript, Tailwind CSS
- **Backend:** FastAPI (Python 3.12), Pydantic, APScheduler
- **Database:** Supabase (managed PostgreSQL) — no local Postgres container
- **Payments:** Stripe (standard auth holds, manual capture — NO SetupIntent, NO stored payment methods)
- **File storage:** VPS filesystem at `/var/hte/uploads` (NEVER served statically by Nginx)
- **Hosting:** Hetzner VPS (5.161.88.134), Docker Compose, Nginx reverse proxy
- **Business timezone:** `America/New_York` — all date-sensitive logic uses this

**Explicitly NOT in the stack:** Redis, S3, Twilio (deferred), Stripe SetupIntent, customer auth.

## Key Constraints

- **One crew, 2 slots/day (AM/PM), shared across ALL service types.** The `UNIQUE(day,slot)` constraint on `capacity_slots` is the structural oversell guarantee. Never weaken it.
- **Reserve-then-charge (R-01):** NEVER wrap a Stripe call inside a DB transaction. Reserve the slot (commit), call Stripe outside any transaction, then confirm/compensate.
- **Money is integer cents everywhere.** No float/numeric for currency.
- **Pinned multipliers (R-07):** one concrete multiplier per tier per service, round-half-up applied once, one shared pricing function.
- **Option B (R-02):** admin has exactly 3 hold actions — Capture, Cancel, Extend-via-link. No Increase/Decrease.

## Architecture

- `web/` — Next.js frontend (SSG marketing pages, client checkout)
- `api/` — FastAPI backend (pricing, capacity, orders, admin, webhooks)
- `nginx/` — Nginx reverse proxy config
- Money endpoints route DIRECT to FastAPI, bypassing any Next.js proxy (R-18)
- `/var/hte/uploads` is never served statically (R-11)

## Run Locally

```bash
docker compose up --build
```

Requires the `hosthampton_hampton_net` external Docker network. For local dev without the VPS network:
```bash
# Frontend only
cd web && npm install && npm run dev

# API only
cd api && pip install -r requirements.txt && uvicorn app.main:app --reload
```

## Build Before You Commit

```bash
cd web && npm run build
cd api && python -m pytest
```

## Spec & Build Plan

- **Spec:** `hamptons-tree-experts-spec-v2.md` (LOCKED — source of truth)
- **SOW:** `hamptons-tree-experts-sow-v2.2.md`
- **Build plan:** `hamptons-tree-experts-buildplan.md`
- **Phase files:** `hamptons-tree-experts-phase-{00..08}-*.md`
- **Review prompts:** `hamptons-tree-experts-review-prompts.md`
- **Progress:** `hamptons-tree-experts-progress.md`

## Deploy

SSH alias: `hampton-vps`. Deploy path on VPS: TBD (Phase 07).
Push to main triggers build. Production deploy is `git pull + docker compose up --build`.

## What NOT to Do

- Don't add Redis, S3, Twilio, or SetupIntent — they're explicitly out of stack.
- Don't wrap Stripe calls in DB transactions (R-01).
- Don't use float/numeric for money — integer cents only.
- Don't serve `/var/hte/uploads` statically — photos go through the auth'd API endpoint only.
- Don't add features beyond the current phase scope.
- Don't weaken the `UNIQUE(day,slot)` constraint.
