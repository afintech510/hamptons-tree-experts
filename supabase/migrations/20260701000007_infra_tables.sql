-- Phase 01: processed_webhooks + outbox_emails + job_runs (spec §2.2, §1.3)
-- Implements: R-10 webhook idempotency, reliable email (R-08-email), job health (R-31)
-- Rollback: drop table job_runs; drop table outbox_emails; drop table processed_webhooks;

-- R-10: the webhook checks-and-inserts the Stripe event id here before processing,
-- so redelivery is a no-op.
create table processed_webhooks (
    event_id    text primary key,
    created_at  timestamptz not null default now()
);

-- DB-backed outbox (R-08-email) drained by the per-minute outbox-dispatch job.
-- No in-memory queue — the stack has no Redis, and an in-memory queue loses
-- messages on container restart.
create table outbox_emails (
    id          uuid primary key default gen_random_uuid(),
    to_email    text not null,
    template    text not null,
    payload     jsonb not null default '{}'::jsonb,
    status      text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
    attempts    integer not null default 0,
    last_error  text,
    created_at  timestamptz not null default now(),
    sent_at     timestamptz
);

create index idx_outbox_emails_status on outbox_emails (status) where status = 'pending';

-- R-31: /health reports whether each job's last_success_at is within its expected
-- interval, so a silently-dead scheduler is detectable.
create table job_runs (
    id                uuid primary key default gen_random_uuid(),
    job_name          text not null unique,
    last_success_at   timestamptz,
    last_error        text,
    updated_at        timestamptz not null default now()
);
