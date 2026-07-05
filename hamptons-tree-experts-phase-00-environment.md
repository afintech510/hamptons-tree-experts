# Phase 00: Environment & Infrastructure
**Project:** Hamptons Tree Experts Platform
**Spec:** `hamptons-tree-experts-spec-v2.md`
**Build Plan:** `hamptons-tree-experts-buildplan.md`
**Prerequisites:** None
**Implements:** Infrastructure (foundation for F-017, F-018, and all money-route security)
**Recommended:** `claude --max-turns 25`

---

## 1. Context

You are executing **Phase 00: Environment & Infrastructure** of the Hamptons Tree Experts build — a standalone marketing + e-commerce platform for a one-crew tree service on the East End of Long Island.

**Your scope is strictly this phase.** Do not implement any feature, schema, endpoint, or UI component. This phase only stands up the project skeleton, containerization, and the environment-level configuration that later phases depend on.

**Tech Stack (spec §1.2):** Next.js (App Router) frontend, FastAPI (Python) backend, Supabase/PostgreSQL, Stripe, Docker + Docker Compose + Nginx on a Hetzner VPS. No Redis, no S3, no Twilio, no Stripe SetupIntent — these are explicitly out of stack.
**Working Directory:** project root (create it).
**Spec File:** `hamptons-tree-experts-spec-v2.md` — READ §1.2 and §1.3 FIRST. Source of truth.

### What Already Exists
Nothing. This is the first phase.

### What You're Building
A running Docker Compose stack (`web`, `api`, `nginx`) with correct environment scaffolding, the canonical business timezone, an Nginx config that routes money endpoints correctly and refuses to statically serve uploaded photos, and a design-tokens file the frontend phases will consume.

---

## 2. Objective & Deliverables

### Objective
After this phase, `docker compose up` starts a clean `web` + `api` + `nginx` stack with the correct timezone and routing posture, and a documented `.env.example` — ready for schema and auth work in Phase 01.

### Deliverables
1. Project scaffolding — directory structure per spec §4.1 (App Router layout, FastAPI app, shared config).
2. Docker Compose config for `web`, `api`, `nginx` — spec §1.3.
3. Nginx reverse-proxy config — spec §1.2 "Money endpoint routing" and §1.3.
4. `.env.example` documenting every required secret (Stripe keys, Supabase URL/keys, email creds, admin bootstrap) — do NOT commit real values.
5. Base Dockerfiles for `web` and `api` (multi-stage, non-root user).
6. Timezone configuration — `America/New_York` as the canonical business timezone (spec §1.2, R-08).
7. `hamptons-tree-experts-design-tokens-v1` — a tokens file capturing the approved palette and type direction (spec §4.2, F-017): deep evergreen `#1F3A2E`, bark brown `#4A3728`, warm stone/sand `#E8E2D4`, controlled rust-orange accent `#C4622D` (used ONLY for urgency-tier pricing + primary CTAs), serif display face + clean grotesk body + monospace face for price numerals. Store as CSS custom properties / a shared token module the frontend phases import.

---

## 3. Implementation Instructions

### Task 1: Scaffold the repository
**Spec Reference:** §4.1
**Creates:** directory tree, base config files
Create the Next.js App Router structure and the FastAPI app structure per §4.1. Keep `web/` and `api/` as clearly separated services. Add a root `README.md` documenting how to run the stack.

### Task 2: Dockerize
**Spec Reference:** §1.3
**Creates:** `web/Dockerfile`, `api/Dockerfile`, `docker-compose.yml`
Multi-stage builds, non-root users. Compose defines `web`, `api`, `nginx`, and a named volume mounted at `/var/hte/uploads` for later photo storage (do not implement upload logic — just provision the volume). Supabase is external/managed — reference it via env, do not containerize a Postgres.

### Task 3: Nginx configuration — CRITICAL routing posture
**Spec Reference:** §1.2 (Money endpoint routing, R-18), §1.3, §7.3
**Creates:** `nginx/nginx.conf`
- Nginx terminates TLS (Let's Encrypt; document the cert path, stub for local).
- **Route the Stripe webhook and all money endpoints (`/api/v1/orders/bin`, `/api/v1/estimates`, `/api/v1/orders/authorize-confirm`, `/api/v1/admin/*`, `/api/v1/webhooks/stripe`) DIRECTLY to the FastAPI `api` service** — they must NOT pass through any Next.js proxy, so the raw request body reaches Stripe signature verification untouched (R-18).
- Configure `real_ip` / trust `X-Forwarded-For` only from the known proxy hop so rate-limit and enumeration defenses (built later) key off the true client IP.
- **`/var/hte/uploads` MUST NOT be served statically** (R-11) — no `location` block exposes it; photos will be streamed later only through an authenticated API endpoint. Explicitly document this prohibition in a comment.

### Task 4: Environment + timezone
**Spec Reference:** §1.2 (business timezone R-08), §1.3
**Creates:** `.env.example`, timezone config
Set the container `TZ=America/New_York` AND ensure the FastAPI app computes business dates/times in `America/New_York` (document that timestamps are stored UTC and converted at the boundary). `.env.example` lists every secret with a comment, no real values.

### Task 5: Design tokens
**Spec Reference:** §4.2, F-017
**Creates:** `web/src/styles/design-tokens.*` (CSS vars + a shared TS token module)
Encode the palette and type roles listed in Deliverable 7. Enforce that rust-orange `#C4622D` is reserved for urgency-tier pricing and primary CTAs only. Do NOT build any components — just the tokens.

**Skills Reference (read before Task 5):** `view /mnt/skills/public/frontend-design/SKILL.md` — follow its design-token discipline; the tokens must express the approved evergreen/bark/sand + rust direction, not a generic default palette.

---

## 4. Acceptance Criteria

### Automated
- [ ] `docker compose up` starts `web`, `api`, `nginx` with no errors.
- [ ] `web` responds on its port; `api` responds on `/health` (stub is fine this phase).
- [ ] Container timezone resolves to `America/New_York`.

### Functional
- [ ] Nginx routes `/api/v1/webhooks/stripe` and money endpoints directly to `api` (verify config, even if endpoints 404 this phase).
- [ ] No Nginx `location` serves `/var/hte/uploads`; the prohibition is commented.
- [ ] `.env.example` documents every secret referenced in spec §1.2; no real secrets committed.
- [ ] Design tokens file exists with the exact palette hex values and reserves rust-orange for pricing/CTAs only.

---

## 5. Constraints

### Hard (violation = phase failure)
- Exact stack from §1.2. No Redis, no S3, no Twilio, no SetupIntent — do not add them "for later."
- Money endpoints and the Stripe webhook route direct-to-FastAPI (R-18). Non-negotiable.
- `/var/hte/uploads` is never statically served (R-11).
- No feature/schema/endpoint/component work — infrastructure only.

### Soft (document deviations)
- Follow §4.1 structure; if you add a directory, document why.
- Mark spec ambiguities `// SPEC-AMBIGUITY: ...`.

---

## 6. Completion Protocol
Provide the standard structured report: Files Created, Files Modified, Acceptance Criteria Results, Spec Ambiguities, Blocked Items, Decisions Made, and **Warnings for Next Phase** (Phase 01 needs: confirmed Supabase connection env, the uploads volume path, and the timezone convention).

---

## 7. Execution & Orchestration

### Run Configuration
`claude --max-turns 25`. Low complexity — should complete in one run.

### Task Planning
1. Read spec §1.2, §1.3, §4.1, §4.2. 2. Scaffold. 3. Dockerize. 4. Nginx. 5. Env/TZ. 6. Tokens.

### Resumption (--continue)
Re-read this prompt, check the filesystem for what exists, resume at the first incomplete task, do not restart.

### Autonomous Decision Authority
Spec defines it → follow exactly. Spec silent → reasonable choice, mark `// SPEC-AMBIGUITY:`. Contradiction → `// ESCALATE:` and skip.

### Progress Tracking
Note progress in `PHASE-00-PROGRESS.md` after each major task.
