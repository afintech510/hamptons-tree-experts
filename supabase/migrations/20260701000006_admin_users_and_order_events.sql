-- Phase 01: admin_users + order_events (spec §2.2)
-- Implements: F-015 (dashboard auth), audit trail for F-013/F-020 admin actions
-- Rollback: drop table order_events; drop table admin_users;

-- Thin profile table linking a Supabase Auth uid to a role. Single admin at launch
-- (§7.1); the row itself is created by the bootstrap script (Task 6), not here.
create table admin_users (
    id          uuid primary key references auth.users (id) on delete cascade,
    role        text not null default 'admin',
    created_at  timestamptz not null default now()
);

alter table admin_users enable row level security;

-- Admins may only read their own profile row; there is no public access.
create policy admin_users_self_select on admin_users
    for select
    using (auth.uid() = id);

create table order_events (
    id              uuid primary key default gen_random_uuid(),
    order_id        uuid not null references orders (id),
    -- Nullable for system-generated events (e.g. soft_hold_expired, bumped_by_bin).
    admin_user_id   uuid references admin_users (id),
    event_type      text not null check (
        event_type in (
            'authorized',
            'captured',
            'cancelled',
            'reauthorized_increase',
            'reauthorized_decrease',
            'reauthorized_same',
            'rescheduled',
            'soft_hold_expired',
            'bumped_by_bin'
        )
    ),
    detail          jsonb not null default '{}'::jsonb,
    created_at      timestamptz not null default now()
);

create index idx_order_events_order_id on order_events (order_id);

comment on table order_events is 'Append-only audit log — no UPDATE/DELETE (enforced below).';

create or replace function order_events_block_mutation()
returns trigger as $$
begin
    raise exception 'order_events is append-only; % not permitted', tg_op;
end;
$$ language plpgsql;

create trigger trg_order_events_no_update
    before update on order_events
    for each row
    execute function order_events_block_mutation();

create trigger trg_order_events_no_delete
    before delete on order_events
    for each row
    execute function order_events_block_mutation();
