-- ════════════════════════════════════════════════════════════════════
-- 003: Lookup value seeds
-- Moves hard-coded frontend constants into the lookup_values table so
-- new values can be added without a code deploy.
-- ════════════════════════════════════════════════════════════════════

-- ── DS Regions (was hardcoded array in RequestDetailsStep.tsx) ────
insert into public.lookup_values (table_slug, key, value, label) values
  ('ds_regions', 'east-africa',   'East Africa',   'East Africa'),
  ('ds_regions', 'kenya',         'Kenya',         'Kenya'),
  ('ds_regions', 'tanzania',      'Tanzania',      'Tanzania'),
  ('ds_regions', 'uganda',        'Uganda',        'Uganda'),
  ('ds_regions', 'shared',        'Shared',        'Shared'),
  ('ds_regions', 'south-africa',  'South Africa',  'South Africa')
on conflict (table_slug, key) do nothing;

-- ── Change Management org groups (referenced by CM workflow) ──────
insert into public.org_groups (group_slug, email) values
  ('cab-reviewers', 'cab@seacom.com'),
  ('carrier-noc',   'noc@seacom.com')
on conflict (group_slug, email) do nothing;
