# Hamptons Tree Experts

Booking and capacity platform for a tree service and debris-removal company.
Customers get an instant estimate range, reserve a delivery slot against real
capacity limits, and are charged only after the job is confirmed.

## Stack

FastAPI (Python) · Supabase/PostgreSQL · Stripe · Next.js marketing site
· Docker Compose + nginx on a single VPS

## What's interesting here

- **Authorize-then-confirm payments.** Cards are authorised at booking and captured
  only once the job is confirmed, so customers aren't charged for slots that turn
  out to be unservable. See `api/app/routers/authorize_confirm.py`.
- **Capacity-aware checkout with soft holds.** A slot is held while the customer
  completes checkout and released automatically if they abandon
  (`api/app/jobs/soft_hold_expiry.py`), which prevents both double-booking and
  inventory permanently locked by dropped sessions.
- **Estimate ranges, not fake precision.** Pricing returns a bounded range derived
  from job attributes rather than a single number the business can't honour.
- **Scheduled data hygiene.** `photo_purge.py` deletes customer-uploaded job photos
  on a retention schedule rather than keeping them indefinitely.

## Tests

```bash
cd api && pytest
```

Covers admin auth, API contracts, capacity limits, estimate ranges, order
numbering and status transitions, plant pricing, and integration paths.

## Development

```bash
cp .env.example .env
docker compose up --build
```

## Spec-first build

This project was specified before it was written. `hamptons-tree-experts-spec-v2.md`
and the `phase-00` through `phase-08` documents define the environment, data model,
checkout flow, testing strategy, and deployment steps; the code follows them.
`hamptons-tree-experts-progress.md` tracks status against that plan.

## Layout

```
api/        FastAPI backend — routers, models, auth, scheduled jobs, tests
web/        Next.js marketing site
supabase/   database schema and migrations
nginx/      reverse-proxy configuration
```
