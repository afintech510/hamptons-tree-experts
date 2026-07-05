-- Phase 01: orders (spec §2.2)
-- Implements: F-003–F-014, F-020
-- Rollback: drop table "orders"; (also drops the write-once trigger)
--
-- Money discipline: every currency column below is `integer` cents.
-- Do not add float/numeric currency columns to this table — ever (spec §2.3).

create table orders (
    id                        uuid primary key default gen_random_uuid(),
    -- High-entropy human-facing lookup id (R-12): 4-char service prefix + 10 random
    -- base32 chars, e.g. HTE-7K2P9QX4MB. Never sequential (see app/services/order_number.py).
    order_number              text not null unique,
    service_type_id           uuid not null references service_types (id),
    -- Denormalized from service_type at order time so later catalog edits don't
    -- rewrite the fulfillment path of historical orders.
    fulfillment_type          text not null,
    status                    text not null default 'pending_payment' check (
        status in (
            'pending_payment',
            'authorized',
            'captured',
            'confirmed_scheduled',
            'needs_reslot',
            'rescheduled',
            'cancelled',
            'completed',
            'expired'
        )
    ),
    -- NULL for estimate-type orders (R-34) — tree removal has no urgency tier.
    urgency_tier              text check (urgency_tier in ('tomorrow', '2_5_day', '6_14_day')),
    -- Currently-authorized/captured amount. Integer cents, never float (§2.3).
    amount_cents              integer not null check (amount_cents >= 0),
    -- Written once at creation, never updated after (R-23) — enforced by trigger below.
    original_quote_cents      integer not null check (original_quote_cents >= 0),
    -- R-13: true only when the customer actively checks the F-020 disclosure at checkout.
    policy_acknowledged       boolean not null default false,
    -- The currently ACTIVE PaymentIntent (R-05). Updated on Extend; webhook ignores
    -- `canceled` events for any PI id that isn't this one.
    stripe_payment_intent_id  text,
    stripe_auth_expires_at    timestamptz,
    customer_email            text not null,
    customer_phone            text not null,
    customer_name             text not null,
    service_address           text not null,
    -- FK to capacity_slots added in the capacity migration (that table doesn't exist yet).
    slot_id                   uuid,
    created_at                timestamptz not null default now(),
    updated_at                timestamptz not null default now()
);

comment on column orders.amount_cents is 'Integer cents only — never float/numeric for currency (spec §2.3).';
comment on column orders.original_quote_cents is 'Write-once (R-23): preserves quote-vs-final history even if amount_cents changes later.';

-- R-23: original_quote_cents is write-once — reject any UPDATE that changes it.
create or replace function orders_enforce_original_quote_write_once()
returns trigger as $$
begin
    if new.original_quote_cents is distinct from old.original_quote_cents then
        raise exception 'original_quote_cents is write-once and cannot be modified (R-23)';
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trg_orders_original_quote_write_once
    before update on orders
    for each row
    execute function orders_enforce_original_quote_write_once();

-- Keep updated_at current on every row change.
create or replace function orders_set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger trg_orders_set_updated_at
    before update on orders
    for each row
    execute function orders_set_updated_at();

-- idx_orders_order_number: the UNIQUE constraint above already creates this index.
create index idx_orders_status on orders (status);
create index idx_orders_auth_expires on orders (stripe_auth_expires_at) where status = 'authorized';
-- R-22: manual phone-recovery/dashboard-search flow needs these or it's a full table scan.
create index idx_orders_customer_phone on orders (customer_phone);
create index idx_orders_customer_name on orders (customer_name);
