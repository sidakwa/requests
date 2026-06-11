-- ============================================================
-- Migration: Add Group BU, update DI & DS departments, add Region
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add Group business unit
INSERT INTO business_units (code, name)
VALUES ('GRP', 'Group')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- 2. Schema changes
ALTER TABLE departments ADD COLUMN IF NOT EXISTS business_unit TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE funding_requests ADD COLUMN IF NOT EXISTS region TEXT;

-- 3. Mark any pre-existing departments as DI so FKs from funding_requests are preserved.
--    Then delete old ones that have no references so we can re-insert fresh data.
UPDATE departments SET business_unit = 'DI' WHERE business_unit IS NULL;

-- Remove approval_matrix rows for departments we're about to replace
-- (approval_matrix is configuration data and will be rebuilt from the new departments)
DELETE FROM approval_matrix
WHERE department_id NOT IN (
  SELECT DISTINCT department_id FROM funding_requests WHERE department_id IS NOT NULL
);

-- Delete departments that are not referenced by any funding_request or approval_matrix
DELETE FROM departments
WHERE id NOT IN (
  SELECT DISTINCT department_id FROM funding_requests WHERE department_id IS NOT NULL
);

-- ============================================================
-- 4. Digital Infrastructure (DI)
-- ============================================================
INSERT INTO departments (name, business_unit, head_email, chief_email) VALUES
  ('MS Core Network',       'DI', 'mohammed.cassim@seacom.com',       'prenesh.padayachee@seacom.com'),
  ('Procurement',           'DI', 'percy.macaskill@seacom.com',        'percy.macaskill@seacom.com'),
  ('FFTX Projects',         'DI', 'kirsten.erasmus@seacom.com',        'prenesh.padayachee@seacom.com'),
  ('Billing',               'DI', 'jaco.burger@seacom.com',            'percy.macaskill@seacom.com'),
  ('Credit Control',        'DI', 'jaco.burger@seacom.com',            'percy.macaskill@seacom.com'),
  ('Finance Accounting',    'DI', 'jaco.burger@seacom.com',            'percy.macaskill@seacom.com'),
  ('Sales - Wholesale',     'DI', 'radha.valla@seacom.com',            'ricky.schumacher@seacom.com'),
  ('Engineering',           'DI', 'david.kariuki@seacom.com',          'prenesh.padayachee@seacom.com'),
  ('Network Operations',    'DI', 'alex.nheve@seacom.com',             'prenesh.padayachee@seacom.com'),
  ('Product',               'DI', 'cheslin.cupido@seacom.com',         'ricky.schumacher@seacom.com'),
  ('CEO',                   'DI', 'ricky.schumacher@seacom.com',       'ricky.schumacher@seacom.com'),
  ('Finance Operations',    'DI', 'percy.macaskill@seacom.com',        'ricky.schumacher@seacom.com'),
  ('Human Resources',       'DI', 'thabo.mphamo@seacom.com',           'ricky.schumacher@seacom.com'),
  ('Service Operations',    'DI', 'simon.mckenzie@seacom.com',         'prenesh.padayachee@seacom.com'),
  ('Commercial',            'DI', 'percy.macaskill@seacom.com',        'percy.macaskill@seacom.com'),
  ('Voice and Wireless',    'DI', 'david.kariuki@seacom.com',          'prenesh.padayachee@seacom.com'),
  ('Facilities',            'DI', 'alex.nheve@seacom.com',             'prenesh.padayachee@seacom.com'),
  ('Marketing',             'DI', 'mandisa.ntloko-petersen@seacom.com','prenesh.padayachee@seacom.com'),
  ('Solutions',             'DI', 'wesley.solomin@seacom.com',         'prenesh.padayachee@seacom.com'),
  ('Legal',                 'DI', 'percy.macaskill@seacom.com',        'ricky.schumacher@seacom.com'),
  ('Directors',             'DI', 'ricky.schumacher@seacom.com',       'ricky.schumacher@seacom.com')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Group (GRP)
-- ============================================================
INSERT INTO departments (name, business_unit, head_email, chief_email) VALUES
  ('Finance Accounting',               'GRP', 'chari.slabbert@seacom.com',     'chari.slabbert@seacom.com'),
  ('Directors',                        'GRP', 'alpheus.mangale@seacom.com',     'alpheus.mangale@seacom.com'),
  ('CEO',                              'GRP', 'alpheus.mangale@seacom.com',     'alpheus.mangale@seacom.com'),
  ('Procurement',                      'GRP', 'andre.haupt@seacom.com',         'chari.slabbert@seacom.com'),
  ('Legal',                            'GRP', 'carmen.cupido@seacom.com',       'chari.slabbert@seacom.com'),
  ('Financial Planning and Analysis',  'GRP', 'nonhianhla.kathanya@seacom.com', 'chari.slabbert@seacom.com'),
  ('Human Resources',                  'GRP', 'monica.sennelo@seacom.com',      'alpheus.mangale@seacom.com'),
  ('Finance Operations',               'GRP', 'donavan.isaac@seacom.com',       'chari.slabbert@seacom.com'),
  ('Facilities',                       'GRP', 'geraldine.cronje@seacom.com',    'chari.slabbert@seacom.com'),
  ('Programme Management Office',      'GRP', 'tiaan.taljaard@seacom.com',      'alpheus.mangale@seacom.com'),
  ('Marketing',                        'GRP', 'alpheus.mangale@seacom.com',     'alpheus.mangale@seacom.com')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. Digital Services (DS) — with Region
-- ============================================================
INSERT INTO departments (name, business_unit, region, head_email, chief_email) VALUES
  -- East Africa
  ('Facilities',                      'DS', 'East Africa', 'geraldine.cronje@seacom.com',  'chari.slabbert@seacom.com'),
  ('Service Operations',              'DS', 'East Africa', 'tshepo.maake@seacom.com',      'alpheus.mangale@seacom.com'),
  ('Billing',                         'DS', 'East Africa', 'dhesan.naidoo@seacom.com',     'michael.meiring@seacom.com'),
  ('Sales Ops and Enablement',        'DS', 'East Africa', 'robert.kuria@seacom.com',      'parag.patil@seacom.com'),
  ('Finance Accounting',              'DS', 'East Africa', 'dhesan.naidoo@seacom.com',     'michael.meiring@seacom.com'),
  ('Customer Operations',             'DS', 'East Africa', 'tshepo.maake@seacom.com',      'alpheus.mangale@seacom.com'),
  ('Product',                         'DS', 'East Africa', 'pius.waweru@seacom.com',       'parag.patil@seacom.com'),
  ('Solutions',                       'DS', 'East Africa', 'pius.waweru@seacom.com',       'parag.patil@seacom.com'),
  ('Procurement',                     'DS', 'East Africa', 'dhesan.naidoo@seacom.com',     'michael.meiring@seacom.com'),
  ('Legal',                           'DS', 'East Africa', 'letty.ndlovu@seacom.com',      'michael.meiring@seacom.com'),
  ('Finance Operations',              'DS', 'East Africa', 'dhesan.naidoo@seacom.com',     'michael.meiring@seacom.com'),
  ('Credit Control',                  'DS', 'East Africa', 'dhesan.naidoo@seacom.com',     'michael.meiring@seacom.com'),
  ('CEO',                             'DS', 'East Africa', 'alpheus.mangale@seacom.com',   'michael.meiring@seacom.com'),
  -- Kenya
  ('Sales - Corporate (Seacom Business)', 'DS', 'Kenya',    'robert.kuria@seacom.com',  'parag.patil@seacom.com'),
  -- Tanzania
  ('Sales - Corporate (Seacom Business)', 'DS', 'Tanzania', 'robert.kuria@seacom.com',  'parag.patil@seacom.com'),
  -- Uganda
  ('Sales - Corporate (Seacom Business)', 'DS', 'Uganda',   'patrick.ndegwa@seacom.com','alpheus.mangale@seacom.com'),
  -- Shared
  ('IT Service Management',           'DS', 'Shared', 'george.gakuya@seacom.com',      'tiaan.taljaard@seacom.com'),
  ('IT: DevSecOps',                   'DS', 'Shared', 'watson.kamanga@seacom.com',      'tiaan.taljaard@seacom.com'),
  ('Finance Accounting',              'DS', 'Shared', 'dhesan.naidoo@seacom.com',       'michael.meiring@seacom.com'),
  ('Marketing',                       'DS', 'Shared', 'liewellyn.ramsagar@seacom.com',  'alpheus.mangale@seacom.com'),
  ('Programme Management Office',     'DS', 'Shared', 'tiaan.taljaard@seacom.com',      'alpheus.mangale@seacom.com'),
  ('Human Resources',                 'DS', 'Shared', 'monica.sennelo@seacom.com',      'alpheus.mangale@seacom.com'),
  -- South Africa
  ('Voice and Wireless',              'DS', 'South Africa', 'tshepo.maake@seacom.com',      'deon.geyser@seacom.com'),
  ('Customer Operations',             'DS', 'South Africa', 'tshepo.maake@seacom.com',      'deon.geyser@seacom.com'),
  ('Credit Control',                  'DS', 'South Africa', 'michael.meiring@seacom.com',   'deon.geyser@seacom.com'),
  ('MS Deployments',                  'DS', 'South Africa', 'tshepo.maake@seacom.com',      'deon.geyser@seacom.com'),
  ('Service Operations',              'DS', 'South Africa', 'tshepo.maake@seacom.com',      'deon.geyser@seacom.com'),
  ('Solutions',                       'DS', 'South Africa', 'reinaldo.do.rego@seacom.com',  'deon.geyser@seacom.com'),
  ('MS Core Network',                 'DS', 'South Africa', 'tshepo.maake@seacom.com',      'deon.geyser@seacom.com'),
  ('Finance Operations',              'DS', 'South Africa', 'michael.meiring@seacom.com',   'deon.geyser@seacom.com'),
  ('Network Solution Sales',          'DS', 'South Africa', 'clayton.codd@seacom.com',      'deon.geyser@seacom.com'),
  ('Product',                         'DS', 'South Africa', 'reinaldo.do.rego@seacom.com',  'deon.geyser@seacom.com'),
  ('Engineering',                     'DS', 'South Africa', 'tshepo.maake@seacom.com',      'deon.geyser@seacom.com'),
  ('Finance Accounting',              'DS', 'South Africa', 'michael.meiring@seacom.com',   'deon.geyser@seacom.com'),
  ('Sales Ops and Enablement',        'DS', 'South Africa', 'ma-afrika.kekana@seacom.com',  'deon.geyser@seacom.com'),
  ('IT Service Management',           'DS', 'South Africa', 'tiaan.taljaard@seacom.com',    'alpheus.mangale@seacom.com'),
  ('Billing',                         'DS', 'South Africa', 'michael.meiring@seacom.com',   'deon.geyser@seacom.com'),
  ('Procurement',                     'DS', 'South Africa', 'michael.meiring@seacom.com',   'deon.geyser@seacom.com'),
  ('Sales - Channel',                 'DS', 'South Africa', 'clayton.codd@seacom.com',      'deon.geyser@seacom.com'),
  ('Sales - Corporate (Seacom Business)', 'DS', 'South Africa', 'clayton.codd@seacom.com',  'deon.geyser@seacom.com'),
  ('Hosting Technologies',            'DS', 'South Africa', 'reinaldo.do.rego@seacom.com',  'deon.geyser@seacom.com'),
  ('CEO',                             'DS', 'South Africa', 'deon.geyser@seacom.com',       'alpheus.mangale@seacom.com'),
  ('Network Operations',              'DS', 'South Africa', 'tshepo.maake@seacom.com',      'deon.geyser@seacom.com'),
  ('Legal',                           'DS', 'South Africa', 'letty.ndlovu@seacom.com',      'deon.geyser@seacom.com'),
  ('Facilities',                      'DS', 'South Africa', 'geraldine.cronje@seacom.com',  'chari.slabbert@seacom.com'),
  ('Programme Management Office',     'DS', 'South Africa', 'tiaan.taljaard@seacom.com',    'alpheus.mangale@seacom.com'),
  ('IT: DevSecOps',                   'DS', 'South Africa', 'watson.kamanga@seacom.com',     'tiaan.taljaard@seacom.com'),
  ('Sales - Public Sector',           'DS', 'South Africa', 'clayton.codd@seacom.com',      'deon.geyser@seacom.com')
ON CONFLICT DO NOTHING;
