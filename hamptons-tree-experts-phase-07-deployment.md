# Phase 07: Deployment & Ops
**Project:** Hamptons Tree Experts Platform
**Spec:** `hamptons-tree-experts-spec-v2.md`
**Build Plan:** `hamptons-tree-experts-buildplan.md`
**Prerequisites:** Phase 06 complete
**Implements:** Operations for all features (spec §8.2, §8.3, §1.3)
**Recommended:** `claude --max-turns 50`

---

## 1. Context

You are executing **Phase 07: Deployment & Ops** — production configuration, monitoring, backup coordination, and health. Mostly configuration, not new code.

**Your scope is strictly this phase.** Production Docker/Nginx/TLS, health + job monitoring, backup coordination + a restore test, smoke tests. Do NOT add features.

**Tech Stack (spec §1.2, §1.3):** Docker Compose + Nginx on the Hetzner VPS (5.161.88.134, SSH alias `hampton-vps`), managed Supabase Postgres, VPS photo volume.
**Working Directory:** project root.
**Spec File:** `hamptons-tree-experts-spec-v2.md` — READ §1.3, §8.2, §8.3, §7.3 FIRST.

### What Already Exists
- Phases 00–06: full tested stack. Phase 00 established the Docker/Nginx skeleton and money-route posture; Phase 01 added the `job_runs` table; Phases 03/05 added the advisory-locked background jobs (soft-hold expiry, auth reminder, photo purge, outbox dispatch).

### What You're Building
The production deployment posture that makes the running system observable, backed up, and recoverable.

---

## 2. Objective & Deliverables

### Objective
After this phase, the platform deploys to production on the Hetzner VPS with TLS, a health endpoint that surfaces both DB and background-job liveness, coordinated backups with a proven restore path, and a documented rollback.

### Deliverables
1. Production Docker Compose + Nginx + TLS (Let's Encrypt) — §1.3.
2. `/health` endpoint reporting DB connectivity AND each job's `last_success_at` freshness (R-31, §8.3).
3. Scheduler single-owner enforcement in production (advisory lock / pinned owner, R-17, §1.3).
4. Coordinated backups: DB + `/var/hte/uploads` photo volume on the same cadence, with the auth'd photo endpoint degrading gracefully on a missing file; ONE documented restore-and-verify test run before photos are live in prod (R-32, §7.3).
5. Structured logging to stdout → Docker → VPS rotation; `order_events` audit trail confirmed append-only (§8.2).
6. Post-deploy smoke tests.
7. Documented rollback (revert to previous Docker image).

---

## 3. Implementation Instructions

### Task 1: Production compose + TLS
**Spec Reference:** §1.3
**Creates:** production compose overlay, Nginx TLS config
Production-grade compose (restart policies, resource limits), Nginx TLS via Let's Encrypt on HamptonsTreeExperts.com. Confirm the money-route-direct + no-static-uploads posture from Phase 00 carries into production config.

### Task 2: Health + job monitoring
**Spec Reference:** §8.3, §1.3 (R-31)
**Creates:** `/health` endpoint, job heartbeat wiring
`/health` returns DB connectivity and, for each background job, whether `last_success_at` (in `job_runs`) is within its expected interval — so a silently-dead scheduler is detectable by an external uptime monitor. Document the external monitor setup.

### Task 3: Scheduler single-owner
**Spec Reference:** §1.3 (R-17)
**Creates:** production scheduler config
Ensure only one scheduler owner runs in production (advisory lock wrap is already in the job bodies from Phases 03/05; enforce single-owner at the deployment level and document that `api` must not run multiple scheduler instances).

### Task 4: Backup coordination + restore test
**Spec Reference:** §7.3 (R-32)
**Creates:** backup config, restore-test doc
Snapshot managed Postgres and the photo volume on the same cadence. Confirm the auth'd photo endpoint returns "photo unavailable" (not 500) on a missing file. Run and document ONE restore-and-verify test before photos go live.

### Task 5: Logging, smoke tests, rollback
**Spec Reference:** §8.2, §1.3
**Creates:** logging config, smoke test script, rollback doc
Structured JSON logs (no PII/card data). Post-deploy smoke tests hitting `/health`, a marketing page, and a test-mode checkout. Document the image-revert rollback.

---

## 4. Acceptance Criteria

### Automated
- [ ] Production deploy succeeds; site reachable over TLS on the domain.
- [ ] `/health` returns green including per-job freshness; kill a job → `/health` reflects it.
- [ ] Smoke tests pass post-deploy.

### Functional
- [ ] DB + photo-volume backups run on the same cadence; restore-and-verify test documented and passed (R-32).
- [ ] Auth'd photo endpoint returns "photo unavailable" (not 500) on a missing file.
- [ ] Only one scheduler owner runs in production (R-17).
- [ ] Rollback procedure documented and dry-run once.

---

## 5. Constraints

### Hard (violation = phase failure)
- No new features. Configuration + ops only.
- Preserve the Phase 00 money-route-direct and no-static-uploads posture in production.
- `/health` must surface job liveness, not just DB (R-31).

### Soft (document deviations)
- Mark ambiguities `// SPEC-AMBIGUITY:`.

---

## 6. Completion Protocol
Standard structured report. **Warnings for Next Phase:** note anything Phase 08 (Claude in Chrome visual validation) should focus on based on what deployed.

---

## 7. Execution & Orchestration

### Run Configuration
`claude --max-turns 50`. Medium.

### Resumption (--continue)
Re-read this prompt, inspect existing config, resume at the first incomplete task.

### Autonomous Decision Authority
Spec defines it → follow. Silent → `// SPEC-AMBIGUITY:`.

### Progress Tracking
Update `PHASE-07-PROGRESS.md` after each task.

**Human decision gate precedes production deploy** — final sign-off on production-readiness before this phase's deploy step runs against the live domain.
