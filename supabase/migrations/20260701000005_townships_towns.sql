-- Phase 01: townships + towns (spec §2.2)
-- Implements: F-002, F-016
-- Rollback: drop table towns; drop table townships;

create table townships (
    id                 uuid primary key default gen_random_uuid(),
    name               text not null unique,
    permit_content     text,
    -- R-29 publish gate: false until human-sourced/fact-checked. Phase 02's
    -- generateStaticParams MUST filter WHERE verified = true.
    verified           boolean not null default false,
    -- Carries the Manorville mixed-jurisdiction caveat (SOW N2).
    jurisdiction_note  text,
    created_at         timestamptz not null default now()
);

comment on column townships.verified is 'R-29 publish gate — unverified township content is never statically generated.';

create table towns (
    id           uuid primary key default gen_random_uuid(),
    name         text not null,
    slug         text not null unique,
    township_id  uuid not null references townships (id),
    created_at   timestamptz not null default now()
);

create index idx_towns_township_id on towns (township_id);
