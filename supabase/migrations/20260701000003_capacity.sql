-- Phase 01: capacity_days + capacity_slots (spec §2.2)
-- Implements: F-011, the O-004 shared-crew oversell invariant
-- Rollback: alter table orders drop constraint fk_orders_slot;
--           drop table capacity_slots; drop table capacity_days;
--
-- Schema + constraints ONLY. Booking logic (lazy day upsert R-14, inline-expiry
-- reclaim R-16, weather-block FOR UPDATE R-15) is Phase 03's job — this migration
-- only ensures the columns/constraints exist to support it.

create table capacity_days (
    day         date primary key,
    am_blocked  boolean not null default false,
    pm_blocked  boolean not null default false,
    created_at  timestamptz not null default now()
);

comment on table capacity_days is 'One row per calendar day; am_blocked/pm_blocked drive the manual weather-pause control.';

create table capacity_slots (
    id                     uuid primary key default gen_random_uuid(),
    day                    date not null references capacity_days (day),
    slot                   text not null check (slot in ('am', 'pm')),
    hold_type              text not null check (hold_type in ('confirmed', 'tentative')),
    order_id               uuid unique references orders (id),
    soft_hold_expires_at   timestamptz,
    created_at             timestamptz not null default now(),
    -- THE single most important constraint in this phase (O-004): it makes
    -- oversell structurally impossible regardless of service type. There are
    -- exactly 2 slot rows possible per day (am, pm), shared across all services.
    constraint uq_capacity_slots_day_slot unique (day, slot)
);

comment on constraint uq_capacity_slots_day_slot on capacity_slots is
    'O-004 oversell guarantee: one crew, 2 slots/day, shared across every service type. Never weaken this.';

-- Partial index for the 15-min soft-hold expiry job (§1.3).
create index idx_slots_soft_expiry on capacity_slots (soft_hold_expires_at) where hold_type = 'tentative';

-- Now that capacity_slots exists, wire up the FK deferred from the orders migration.
alter table orders
    add constraint fk_orders_slot foreign key (slot_id) references capacity_slots (id);
