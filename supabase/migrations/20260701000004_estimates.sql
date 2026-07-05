-- Phase 01: estimates + estimate_photos (spec §2.2)
-- Implements: F-009, F-019
-- Rollback: drop table estimate_photos; drop table estimates;

create table estimates (
    id                          uuid primary key default gen_random_uuid(),
    order_id                    uuid not null references orders (id),
    range_low_cents             integer not null check (range_low_cents >= 0),
    range_high_cents            integer not null check (range_high_cents >= 0),
    -- 48h from creation (R-06 deterministic wide-range window).
    valid_until                 timestamptz not null,
    -- The non-binding checkbox (F-009), not a price confirmation.
    acknowledged                boolean not null default false,
    approx_height_stories       integer,
    distance_to_structure_ft    integer,
    access_notes                text,
    created_at                  timestamptz not null default now(),
    constraint chk_estimates_range_order check (range_high_cents >= range_low_cents)
);

comment on table estimates is 'Tree-removal deterministic wide-range estimates (R-06); auth hold placed at range_high_cents.';

create table estimate_photos (
    id           uuid primary key default gen_random_uuid(),
    estimate_id  uuid not null references estimates (id),
    -- VPS path under /var/hte/uploads; generated UUID filename, never user-controlled (R-11).
    file_path    text not null,
    -- created_at + 90d (F-019); purged by the daily photo-purge job (R-20).
    purge_after  date not null,
    created_at   timestamptz not null default now()
);

create index idx_estimate_photos_purge_after on estimate_photos (purge_after);
