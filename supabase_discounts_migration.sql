-- ─── Discounts table ─────────────────────────────────────────────────────────
-- Owner can set a discount percentage per duration
-- discount_pct: 0-100 (e.g. 20 = 20% off)
-- slot_limit: max number of keys that can be generated at discounted price (null = unlimited)
-- expires_at: when the discount expires (null = no expiry)

create table if not exists discounts (
  id uuid primary key default gen_random_uuid(),
  duration_days integer not null,
  discount_pct integer not null check (discount_pct >= 0 and discount_pct <= 100),
  slot_limit integer,               -- max keys at this price, null = unlimited
  slots_used integer not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists discounts_duration_idx on discounts(duration_days);
create index if not exists discounts_active_idx on discounts(is_active);
