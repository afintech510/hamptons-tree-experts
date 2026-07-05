-- Phase 03: add idempotency_key to orders (R-09)
-- Dedupes order creation server-side so a mobile double-tap or network retry
-- returns the original order rather than creating a second.
-- Rollback: alter table orders drop column idempotency_key;

alter table orders add column idempotency_key text unique;

create index idx_orders_idempotency_key on orders (idempotency_key) where idempotency_key is not null;
