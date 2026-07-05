-- Phase 01: service_types (spec §2.2)
-- Implements: F-001, F-003–F-009
-- Rollback: drop table "service_types";

create extension if not exists pgcrypto;

create table service_types (
    id                 uuid primary key default gen_random_uuid(),
    slug               text not null unique,
    name               text not null,
    fulfillment_type   text not null check (fulfillment_type in ('bin_immediate', 'authorize_confirm', 'estimate')),
    pricing_model      jsonb not null,
    active             boolean not null default true,
    created_at         timestamptz not null default now()
);

comment on table service_types is 'Catalog of purchasable services; fulfillment_type drives which checkout path applies.';
comment on column service_types.pricing_model is 'Base rates, pinned per-tier multipliers (R-07), and bounds (e.g. yard cleanup 5 cu yd cap).';
