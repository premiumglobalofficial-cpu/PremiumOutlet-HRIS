-- ============================================================================
-- 100_po_hris_seed_users.sql
-- Premium Outlets HRIS — Complete Demo Users & Employee Population
-- ----------------------------------------------------------------------------
-- Run AFTER:  01_auth_and_profiles.sql through 99_seed_data_optional.sql
-- Run IN:     Supabase Dashboard → SQL Editor  (uses postgres / service_role)
-- Idempotent: Yes — all INSERTs use ON CONFLICT DO NOTHING / DO UPDATE
-- ============================================================================
--
--  ┌──────────────────────────────────────────────────────────────────────┐
--  │  ALL DEMO ACCOUNTS — UNIVERSAL PASSWORD:  Admin@2024                 │
--  └──────────────────────────────────────────────────────────────────────┘
--
--  SYSTEM / ROLE LOGIN ACCOUNTS
--  ┌─────────────────────────────────────────────┬───────────────────────┐
--  │ Email                                       │ Role                  │
--  ├─────────────────────────────────────────────┼───────────────────────┤
--  │ admin@premiumoutlets.com.ph                 │ Admin                 │
--  │ hr@premiumoutlets.com.ph                    │ HR                    │
--  │ finance@premiumoutlets.com.ph               │ Finance               │
--  │ supervisor@premiumoutlets.com.ph            │ Supervisor            │
--  │ payroll@premiumoutlets.com.ph               │ Payroll Admin         │
--  │ auditor@premiumoutlets.com.ph               │ Auditor               │
--  │ employee@premiumoutlets.com.ph              │ Employee (Sam Torres) │
--  │ qr@premiumoutlets.com.ph                    │ Employee (QR kiosk)   │
--  │ qr2@premiumoutlets.com.ph                   │ Employee (QR kiosk 2) │
--  │ face@premiumoutlets.com.ph                  │ Employee (Face recog) │
--  └─────────────────────────────────────────────┴───────────────────────┘
--
--  EMPLOYEE ACCOUNTS (EMP001–EMP025) — all use password: Admin@2024
--    miguel.santos@premiumoutlets.com.ph  andrea.reyes@premiumoutlets.com.ph
--    kevin.delacruz@premiumoutlets.com.ph diana.bautista@premiumoutlets.com.ph
--    joshua.mendoza@premiumoutlets.com.ph joselito.cruz@premiumoutlets.com.ph
--    camille.garcia@premiumoutlets.com.ph maricel.padilla@premiumoutlets.com.ph
--    melissa.fernandez@premiumoutlets.com.ph bernard.aquino@premiumoutlets.com.ph
--    antonio.ramos@premiumoutlets.com.ph  eduardo.magbanua@premiumoutlets.com.ph
--    cynthia.santiago@premiumoutlets.com.ph ferdinand.cabral@premiumoutlets.com.ph
--    nora.dizon@premiumoutlets.com.ph     rafael.torres@premiumoutlets.com.ph
--    patricia.villanueva@premiumoutlets.com.ph ryan.evangelista@premiumoutlets.com.ph
--    emmanuel.santos@premiumoutlets.com.ph rowena.castillo@premiumoutlets.com.ph
--    ronaldo.dizon@premiumoutlets.com.ph  maria.pascual@premiumoutlets.com.ph
--    jerome.concepcion@premiumoutlets.com.ph sheila.ramos@premiumoutlets.com.ph
--    alvin.gutierrez@premiumoutlets.com.ph
-- ============================================================================

-- ─── 0. Enable pgcrypto (needed for crypt / gen_salt) ────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 0b. Clean up old-format department IDs (from earlier migration runs) ────
-- Migration 02 used 'dept_*' IDs; canonical format is 'DEPT-*'.
-- Remove old-format rows so the DEPT-* inserts below succeed cleanly.
DELETE FROM public.departments WHERE id LIKE 'dept\_%' ESCAPE '\';

-- ─── 1. Fix Appearance Config (override legacy NexHRMS default) ──────────────
INSERT INTO public.appearance_config (id, company_name)
VALUES ('default', 'Premium Outlets')
ON CONFLICT (id) DO UPDATE
    SET company_name = 'Premium Outlets';

-- ─── 2. Departments ──────────────────────────────────────────────────────────
INSERT INTO public.departments (id, name, description, color, created_by) VALUES
    ('DEPT-ENG',  'Engineering',     'Software, DevOps, and IT Support',           '#6366f1', 'system'),
    ('DEPT-HR',   'Human Resources', 'Recruitment, Employee Relations, Compliance', '#ec4899', 'system'),
    ('DEPT-FIN',  'Finance',         'Accounting, Payroll, and Financial Analysis', '#22c55e', 'system'),
    ('DEPT-MKT',  'Marketing',       'Digital Marketing and Brand Management',      '#f59e0b', 'system'),
    ('DEPT-DES',  'Design',          'UI/UX Design and Creative Production',        '#a855f7', 'system'),
    ('DEPT-OPS',  'Operations',      'Logistics, Warehouse, and Field Operations',  '#14b8a6', 'system'),
    ('DEPT-SLS',  'Sales',           'Sales Executives and Account Managers',       '#ef4444', 'system'),
    ('DEPT-MGT',  'Management',      'Executive Leadership and Administration',     '#0ea5e9', 'system')
ON CONFLICT (name) DO UPDATE SET
    color       = EXCLUDED.color,
    description = EXCLUDED.description;

-- ─── 3. Auth Users + Profiles + Identities (DO block) ───────────────────────
--
-- Strategy:
--   a) Disable the handle_new_user trigger to prevent duplicate-profile errors
--   b) INSERT auth.users with fixed UUIDs  (ON CONFLICT DO NOTHING)
--   c) Re-enable trigger
--   d) INSERT profiles manually            (ON CONFLICT DO NOTHING)
--   e) INSERT auth.identities              (ON CONFLICT DO NOTHING)
--   f) Ensure must_change_password = false for all demo accounts
--
DO $$
DECLARE
    _inst uuid := '00000000-0000-0000-0000-000000000000';

    -- ── System / Role account UUIDs ──────────────────────────────────────────
    _u001 uuid := 'a0000000-0000-0000-0000-000000000001'; -- admin@
    _u002 uuid := 'a0000000-0000-0000-0000-000000000002'; -- hr@
    _u003 uuid := 'a0000000-0000-0000-0000-000000000003'; -- finance@
    _u004 uuid := 'a0000000-0000-0000-0000-000000000004'; -- employee@  (Sam Torres)
    _u006 uuid := 'a0000000-0000-0000-0000-000000000006'; -- supervisor@
    _u007 uuid := 'a0000000-0000-0000-0000-000000000007'; -- payroll@
    _u008 uuid := 'a0000000-0000-0000-0000-000000000008'; -- auditor@
    _u009 uuid := 'a0000000-0000-0000-0000-000000000009'; -- qr@  (Jamie Reyes)
    _u010 uuid := 'a0000000-0000-0000-0000-000000000010'; -- qr2@ (Riley Santos)
    _u011 uuid := 'a0000000-0000-0000-0000-000000000011'; -- face@(Alex Reyes)

    -- ── Employee account UUIDs (EMP001–EMP025) ───────────────────────────────
    _e001 uuid := 'b0000000-0000-0000-0000-000000000001'; -- miguel.santos
    _e002 uuid := 'b0000000-0000-0000-0000-000000000002'; -- andrea.reyes
    _e003 uuid := 'b0000000-0000-0000-0000-000000000003'; -- kevin.delacruz
    _e004 uuid := 'b0000000-0000-0000-0000-000000000004'; -- diana.bautista
    _e005 uuid := 'b0000000-0000-0000-0000-000000000005'; -- joshua.mendoza
    _e006 uuid := 'b0000000-0000-0000-0000-000000000006'; -- joselito.cruz
    _e007 uuid := 'b0000000-0000-0000-0000-000000000007'; -- camille.garcia
    _e008 uuid := 'b0000000-0000-0000-0000-000000000008'; -- maricel.padilla
    _e009 uuid := 'b0000000-0000-0000-0000-000000000009'; -- melissa.fernandez
    _e010 uuid := 'b0000000-0000-0000-0000-000000000010'; -- bernard.aquino
    _e011 uuid := 'b0000000-0000-0000-0000-000000000011'; -- antonio.ramos
    _e012 uuid := 'b0000000-0000-0000-0000-000000000012'; -- eduardo.magbanua
    _e013 uuid := 'b0000000-0000-0000-0000-000000000013'; -- cynthia.santiago
    _e014 uuid := 'b0000000-0000-0000-0000-000000000014'; -- ferdinand.cabral
    _e015 uuid := 'b0000000-0000-0000-0000-000000000015'; -- nora.dizon
    _e016 uuid := 'b0000000-0000-0000-0000-000000000016'; -- rafael.torres
    _e017 uuid := 'b0000000-0000-0000-0000-000000000017'; -- patricia.villanueva
    _e018 uuid := 'b0000000-0000-0000-0000-000000000018'; -- ryan.evangelista
    _e019 uuid := 'b0000000-0000-0000-0000-000000000019'; -- emmanuel.santos
    _e020 uuid := 'b0000000-0000-0000-0000-000000000020'; -- rowena.castillo
    _e021 uuid := 'b0000000-0000-0000-0000-000000000021'; -- ronaldo.dizon
    _e022 uuid := 'b0000000-0000-0000-0000-000000000022'; -- maria.pascual
    _e023 uuid := 'b0000000-0000-0000-0000-000000000023'; -- jerome.concepcion
    _e024 uuid := 'b0000000-0000-0000-0000-000000000024'; -- sheila.ramos
    _e025 uuid := 'b0000000-0000-0000-0000-000000000025'; -- alvin.gutierrez

BEGIN

-- ── 3a. Note: cannot DISABLE TRIGGER on auth.users in managed Supabase ────────
-- The on_auth_user_created trigger will auto-create minimal profiles when
-- auth.users are inserted. We use ON CONFLICT DO UPDATE below to fill in
-- the full profile details.

-- ── 3b. Insert auth.users ────────────────────────────────────────────────────
INSERT INTO auth.users (
    instance_id, id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at
) VALUES
-- ── System role accounts ──────────────────────────────────────────────────
(_inst,_u001,'authenticated','authenticated','admin@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Alex Rivera","role":"admin"}'::jsonb,
 false,now(),now()),

(_inst,_u002,'authenticated','authenticated','hr@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Jordan Lee","role":"hr"}'::jsonb,
 false,now(),now()),

(_inst,_u003,'authenticated','authenticated','finance@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Morgan Chen","role":"finance"}'::jsonb,
 false,now(),now()),

(_inst,_u004,'authenticated','authenticated','employee@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Sam Torres","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_u006,'authenticated','authenticated','supervisor@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Pat Reyes","role":"supervisor"}'::jsonb,
 false,now(),now()),

(_inst,_u007,'authenticated','authenticated','payroll@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Dana Cruz","role":"payroll_admin"}'::jsonb,
 false,now(),now()),

(_inst,_u008,'authenticated','authenticated','auditor@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Rene Santos","role":"auditor"}'::jsonb,
 false,now(),now()),

(_inst,_u009,'authenticated','authenticated','qr@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Jamie Reyes","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_u010,'authenticated','authenticated','qr2@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Riley Santos","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_u011,'authenticated','authenticated','face@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Alex Reyes","role":"employee"}'::jsonb,
 false,now(),now()),

-- ── Employee accounts EMP001–EMP025 ──────────────────────────────────────
(_inst,_e001,'authenticated','authenticated','miguel.santos@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Miguel Antonio Santos","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e002,'authenticated','authenticated','andrea.reyes@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Andrea Mae Reyes","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e003,'authenticated','authenticated','kevin.delacruz@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Kevin James Dela Cruz","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e004,'authenticated','authenticated','diana.bautista@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Diana Rose Bautista","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e005,'authenticated','authenticated','joshua.mendoza@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Joshua Paul Mendoza","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e006,'authenticated','authenticated','joselito.cruz@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Joselito Rafael Cruz","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e007,'authenticated','authenticated','camille.garcia@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Camille Joy Garcia","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e008,'authenticated','authenticated','maricel.padilla@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Maricel Grace Padilla","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e009,'authenticated','authenticated','melissa.fernandez@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Melissa Anne Fernandez","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e010,'authenticated','authenticated','bernard.aquino@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Bernard Emmanuel Aquino","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e011,'authenticated','authenticated','antonio.ramos@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Antonio Jose Ramos","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e012,'authenticated','authenticated','eduardo.magbanua@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Eduardo Felipe Magbanua","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e013,'authenticated','authenticated','cynthia.santiago@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Cynthia Grace Santiago","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e014,'authenticated','authenticated','ferdinand.cabral@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Ferdinand Mark Cabral","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e015,'authenticated','authenticated','nora.dizon@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Nora Luz Dizon","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e016,'authenticated','authenticated','rafael.torres@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Rafael Miguel Torres","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e017,'authenticated','authenticated','patricia.villanueva@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Patricia Anne Villanueva","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e018,'authenticated','authenticated','ryan.evangelista@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Ryan Patrick Evangelista","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e019,'authenticated','authenticated','emmanuel.santos@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Emmanuel Rey Santos","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e020,'authenticated','authenticated','rowena.castillo@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Rowena Grace Castillo","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e021,'authenticated','authenticated','ronaldo.dizon@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Ronaldo James Dizon","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e022,'authenticated','authenticated','maria.pascual@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Maria Lourdes Pascual","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e023,'authenticated','authenticated','jerome.concepcion@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Jerome Carlo Concepcion","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e024,'authenticated','authenticated','sheila.ramos@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Sheila Marie Ramos","role":"employee"}'::jsonb,
 false,now(),now()),

(_inst,_e025,'authenticated','authenticated','alvin.gutierrez@premiumoutlets.com.ph',
 crypt('Admin@2024',gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}'::jsonb,
 '{"name":"Alvin Jose Gutierrez","role":"employee"}'::jsonb,
 false,now(),now())

ON CONFLICT (id) DO NOTHING;

-- ── 3c. Trigger will have auto-created profiles; update with full details ───
-- ── 3d. Insert profiles manually (ON CONFLICT DO UPDATE fills in extra fields) ─
-- (trigger was active; we update to add phone, birthday, address, etc.)
INSERT INTO public.profiles (
    id, name, email, role,
    phone, birthday, address, emergency_contact,
    must_change_password, profile_complete,
    created_at, updated_at
) VALUES
-- System role accounts
(_u001,'Alex Rivera',   'admin@premiumoutlets.com.ph',      'admin',
 '+63-917-5550101','1985-09-15','Manila, Metro Manila','',false,true,now(),now()),
(_u002,'Jordan Lee',    'hr@premiumoutlets.com.ph',         'hr',
 '+63-917-5550102','1987-03-20','Manila, Metro Manila','',false,true,now(),now()),
(_u003,'Morgan Chen',   'finance@premiumoutlets.com.ph',    'finance',
 '+63-917-5550103','1988-07-11','Manila, Metro Manila','',false,true,now(),now()),
(_u004,'Sam Torres',    'employee@premiumoutlets.com.ph',   'employee',
 '+63-917-5550126','1995-04-20','88 Rizal Avenue, Malate, Manila',
 'Maria Torres (Mother) - +63-918-5550001',false,true,now(),now()),
(_u006,'Pat Reyes',     'supervisor@premiumoutlets.com.ph', 'supervisor',
 '+63-917-5550104','1989-12-05','Manila, Metro Manila','',false,true,now(),now()),
(_u007,'Dana Cruz',     'payroll@premiumoutlets.com.ph',    'payroll_admin',
 '+63-917-5550105','1990-04-18','Manila, Metro Manila','',false,true,now(),now()),
(_u008,'Rene Santos',   'auditor@premiumoutlets.com.ph',    'auditor',
 '+63-917-5550106','1991-08-22','Manila, Metro Manila','',false,true,now(),now()),
(_u009,'Jamie Reyes',   'qr@premiumoutlets.com.ph',         'employee',
 '+63-917-1234567','1998-05-22','123 Shoe Ave, Marikina City',
 'Maria Reyes - +63-918-7654321',false,true,now(),now()),
(_u010,'Riley Santos',  'qr2@premiumoutlets.com.ph',        'employee',
 '+63-918-9876543','1999-11-08','456 Commonwealth Ave, Quezon City',
 'Carlos Santos - +63-919-1112222',false,true,now(),now()),
(_u011,'Alex Reyes',    'face@premiumoutlets.com.ph',       'employee',
 '+63-917-5550029','1993-07-14','29 Dela Rosa Street, Legazpi Village, Makati City',
 'Rosa Reyes (Mother) - +63-918-5550029',false,true,now(),now()),
-- EMP001–EMP025
(_e001,'Miguel Antonio Santos',   'miguel.santos@premiumoutlets.com.ph',    'employee',
 '+63-917-501-0001','1993-06-15','Unit 4B Regent Tower, Salcedo St, Legaspi Village, Makati City',
 'Rosa Santos (Mother) – +63-918-501-0001',false,true,now(),now()),
(_e002,'Andrea Mae Reyes',        'andrea.reyes@premiumoutlets.com.ph',     'employee',
 '+63-917-501-0002','1995-11-23','45 Mabini St, Teachers Village, Quezon City',
 'Carlos Reyes (Father) – +63-918-501-0002',false,true,now(),now()),
(_e003,'Kevin James Dela Cruz',   'kevin.delacruz@premiumoutlets.com.ph',   'employee',
 '+63-917-501-0003','1991-08-07','Blk 12 Lot 4 Green Meadows Ave, Pasig City',
 'Linda Dela Cruz (Mother) – +63-918-501-0003',false,true,now(),now()),
(_e004,'Diana Rose Bautista',     'diana.bautista@premiumoutlets.com.ph',   'employee',
 '+63-917-501-0004','1996-04-12','1503 Wack-Wack Condo, Shaw Blvd, Mandaluyong City',
 'Eduardo Bautista (Father) – +63-918-501-0004',false,true,now(),now()),
(_e005,'Joshua Paul Mendoza',     'joshua.mendoza@premiumoutlets.com.ph',   'employee',
 '+63-917-501-0005','1997-02-28','Flat 2A One Bonifacio High St, BGC, Taguig City',
 'Lina Mendoza (Mother) – +63-918-501-0005',false,true,now(),now()),
(_e006,'Joselito Rafael Cruz',    'joselito.cruz@premiumoutlets.com.ph',    'employee',
 '+63-917-501-0006','1989-03-22','8 Jupiter Street, Bel-Air, Makati City',
 'Carmen Cruz (Wife) – +63-918-501-0006',false,true,now(),now()),
(_e007,'Camille Joy Garcia',      'camille.garcia@premiumoutlets.com.ph',   'employee',
 '+63-917-501-0007','1995-09-18','2205 Cityland Pasig, C. Raymundo Ave, Pasig City',
 'Mario Garcia (Father) – +63-918-501-0007',false,true,now(),now()),
(_e008,'Maricel Grace Padilla',   'maricel.padilla@premiumoutlets.com.ph',  'employee',
 '+63-917-501-0008','1990-12-05','35 Maginhawa St, Teachers Village, Quezon City',
 'Roberto Padilla (Husband) – +63-918-501-0008',false,true,now(),now()),
(_e009,'Melissa Anne Fernandez',  'melissa.fernandez@premiumoutlets.com.ph','employee',
 '+63-917-501-0009','1993-05-30','Tower 1 Robinsons Equitable, Ortigas Center, Pasig City',
 'Pablo Fernandez (Father) – +63-918-501-0009',false,true,now(),now()),
(_e010,'Bernard Emmanuel Aquino', 'bernard.aquino@premiumoutlets.com.ph',   'employee',
 '+63-917-501-0010','1988-07-04','Lot 7 Sta. Rosa Street, San Lorenzo Village, Makati City',
 'Gloria Aquino (Wife) – +63-918-501-0010',false,true,now(),now()),
(_e011,'Antonio Jose Ramos',      'antonio.ramos@premiumoutlets.com.ph',    'employee',
 '+63-917-501-0011','1995-10-17','12B Lourdes St, Highway Hills, Mandaluyong City',
 'Nora Ramos (Mother) – +63-918-501-0011',false,true,now(),now()),
(_e012,'Eduardo Felipe Magbanua', 'eduardo.magbanua@premiumoutlets.com.ph', 'employee',
 '+63-917-501-0012','1994-03-21','7 Shoe Ave, Concepcion Uno, Marikina City',
 'Fe Magbanua (Wife) – +63-918-501-0012',false,true,now(),now()),
(_e013,'Cynthia Grace Santiago',  'cynthia.santiago@premiumoutlets.com.ph', 'employee',
 '+63-917-501-0013','1998-07-09','Unit 201 Antel Corporate Centre, Valero St, Makati City',
 'Teresita Santiago (Mother) – +63-918-501-0013',false,true,now(),now()),
(_e014,'Ferdinand Mark Cabral',   'ferdinand.cabral@premiumoutlets.com.ph', 'employee',
 '+63-917-501-0014','1991-01-14','Blk 4 Lot 9 Gen. San Miguel St, Sangandaan, Caloocan City',
 'Marites Cabral (Wife) – +63-918-501-0014',false,true,now(),now()),
(_e015,'Nora Luz Dizon',          'nora.dizon@premiumoutlets.com.ph',       'employee',
 '+63-917-501-0015','2000-05-25','123 F. Sevilla Blvd, Longos, Malabon City',
 'Domingo Dizon (Father) – +63-918-501-0015',false,true,now(),now()),
(_e016,'Rafael Miguel Torres',    'rafael.torres@premiumoutlets.com.ph',    'employee',
 '+63-917-501-0016','1994-11-30','22 Marcos Alvarez Ave, Talon Dos, Las Pinas City',
 'Leonora Torres (Mother) – +63-918-501-0016',false,true,now(),now()),
(_e017,'Patricia Anne Villanueva','patricia.villanueva@premiumoutlets.com.ph','employee',
 '+63-917-501-0017','2000-09-03','10 Moonwalk Rd, BF Homes, Paranaque City',
 'Vicente Villanueva (Father) – +63-918-501-0017',false,true,now(),now()),
(_e018,'Ryan Patrick Evangelista','ryan.evangelista@premiumoutlets.com.ph', 'employee',
 '+63-917-501-0018','1996-06-14','88 Timog Avenue, Sacred Heart, Quezon City',
 'Rosario Evangelista (Mother) – +63-918-501-0018',false,true,now(),now()),
(_e019,'Emmanuel Rey Santos',     'emmanuel.santos@premiumoutlets.com.ph',  'employee',
 '+63-917-501-0019','1990-04-02','10 Kamagong St, San Antonio Village, Makati City',
 'Elena Santos (Wife) – +63-918-501-0019',false,true,now(),now()),
(_e020,'Rowena Grace Castillo',   'rowena.castillo@premiumoutlets.com.ph',  'employee',
 '+63-917-501-0020','1993-08-19','221 Tramo Street, Pasay City',
 'Alfredo Castillo (Father) – +63-918-501-0020',false,true,now(),now()),
(_e021,'Ronaldo James Dizon',     'ronaldo.dizon@premiumoutlets.com.ph',    'employee',
 '+63-917-501-0021','1997-12-11','156 A. Mabini St, Sangandaan, Caloocan City',
 'Lydia Dizon (Mother) – +63-918-501-0021',false,true,now(),now()),
(_e022,'Maria Lourdes Pascual',   'maria.pascual@premiumoutlets.com.ph',    'employee',
 '+63-917-501-0022','1999-02-07','45 Real St, Pamplona Uno, Las Pinas City',
 'Renato Pascual (Father) – +63-918-501-0022',false,true,now(),now()),
(_e023,'Jerome Carlo Concepcion', 'jerome.concepcion@premiumoutlets.com.ph','employee',
 '+63-917-501-0023','1995-07-26','Block 3 Phase 2 Western Bicutan, Taguig City',
 'Josefa Concepcion (Mother) – +63-918-501-0023',false,true,now(),now()),
(_e024,'Sheila Marie Ramos',      'sheila.ramos@premiumoutlets.com.ph',     'employee',
 '+63-917-501-0024','1994-10-08','2108 Dela Rosa St, Legaspi Village, Makati City',
 'Antonio Ramos (Father) – +63-918-501-0024',false,true,now(),now()),
(_e025,'Alvin Jose Gutierrez',    'alvin.gutierrez@premiumoutlets.com.ph',  'employee',
 '+63-917-501-0025','2000-03-14','89 Batangas St, Sta. Mesa Heights, Quezon City',
 'Corazon Gutierrez (Mother) – +63-918-501-0025',false,true,now(),now())

ON CONFLICT (id) DO UPDATE SET
    name                = EXCLUDED.name,
    role                = EXCLUDED.role,
    phone               = EXCLUDED.phone,
    birthday            = EXCLUDED.birthday,
    address             = EXCLUDED.address,
    emergency_contact   = EXCLUDED.emergency_contact,
    must_change_password= EXCLUDED.must_change_password,
    profile_complete    = EXCLUDED.profile_complete,
    updated_at          = NOW();

-- ── 3e. Insert auth.identities (required for email sign-in) ──────────────────
INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data,
    provider, last_sign_in_at, created_at, updated_at
) VALUES
-- System role accounts
(gen_random_uuid(),'admin@premiumoutlets.com.ph',_u001,
 json_build_object('sub',_u001::text,'email','admin@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'hr@premiumoutlets.com.ph',_u002,
 json_build_object('sub',_u002::text,'email','hr@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'finance@premiumoutlets.com.ph',_u003,
 json_build_object('sub',_u003::text,'email','finance@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'employee@premiumoutlets.com.ph',_u004,
 json_build_object('sub',_u004::text,'email','employee@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'supervisor@premiumoutlets.com.ph',_u006,
 json_build_object('sub',_u006::text,'email','supervisor@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'payroll@premiumoutlets.com.ph',_u007,
 json_build_object('sub',_u007::text,'email','payroll@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'auditor@premiumoutlets.com.ph',_u008,
 json_build_object('sub',_u008::text,'email','auditor@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'qr@premiumoutlets.com.ph',_u009,
 json_build_object('sub',_u009::text,'email','qr@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'qr2@premiumoutlets.com.ph',_u010,
 json_build_object('sub',_u010::text,'email','qr2@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'face@premiumoutlets.com.ph',_u011,
 json_build_object('sub',_u011::text,'email','face@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
-- Employee accounts
(gen_random_uuid(),'miguel.santos@premiumoutlets.com.ph',_e001,
 json_build_object('sub',_e001::text,'email','miguel.santos@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'andrea.reyes@premiumoutlets.com.ph',_e002,
 json_build_object('sub',_e002::text,'email','andrea.reyes@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'kevin.delacruz@premiumoutlets.com.ph',_e003,
 json_build_object('sub',_e003::text,'email','kevin.delacruz@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'diana.bautista@premiumoutlets.com.ph',_e004,
 json_build_object('sub',_e004::text,'email','diana.bautista@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'joshua.mendoza@premiumoutlets.com.ph',_e005,
 json_build_object('sub',_e005::text,'email','joshua.mendoza@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'joselito.cruz@premiumoutlets.com.ph',_e006,
 json_build_object('sub',_e006::text,'email','joselito.cruz@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'camille.garcia@premiumoutlets.com.ph',_e007,
 json_build_object('sub',_e007::text,'email','camille.garcia@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'maricel.padilla@premiumoutlets.com.ph',_e008,
 json_build_object('sub',_e008::text,'email','maricel.padilla@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'melissa.fernandez@premiumoutlets.com.ph',_e009,
 json_build_object('sub',_e009::text,'email','melissa.fernandez@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'bernard.aquino@premiumoutlets.com.ph',_e010,
 json_build_object('sub',_e010::text,'email','bernard.aquino@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'antonio.ramos@premiumoutlets.com.ph',_e011,
 json_build_object('sub',_e011::text,'email','antonio.ramos@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'eduardo.magbanua@premiumoutlets.com.ph',_e012,
 json_build_object('sub',_e012::text,'email','eduardo.magbanua@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'cynthia.santiago@premiumoutlets.com.ph',_e013,
 json_build_object('sub',_e013::text,'email','cynthia.santiago@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'ferdinand.cabral@premiumoutlets.com.ph',_e014,
 json_build_object('sub',_e014::text,'email','ferdinand.cabral@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'nora.dizon@premiumoutlets.com.ph',_e015,
 json_build_object('sub',_e015::text,'email','nora.dizon@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'rafael.torres@premiumoutlets.com.ph',_e016,
 json_build_object('sub',_e016::text,'email','rafael.torres@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'patricia.villanueva@premiumoutlets.com.ph',_e017,
 json_build_object('sub',_e017::text,'email','patricia.villanueva@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'ryan.evangelista@premiumoutlets.com.ph',_e018,
 json_build_object('sub',_e018::text,'email','ryan.evangelista@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'emmanuel.santos@premiumoutlets.com.ph',_e019,
 json_build_object('sub',_e019::text,'email','emmanuel.santos@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'rowena.castillo@premiumoutlets.com.ph',_e020,
 json_build_object('sub',_e020::text,'email','rowena.castillo@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'ronaldo.dizon@premiumoutlets.com.ph',_e021,
 json_build_object('sub',_e021::text,'email','ronaldo.dizon@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'maria.pascual@premiumoutlets.com.ph',_e022,
 json_build_object('sub',_e022::text,'email','maria.pascual@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'jerome.concepcion@premiumoutlets.com.ph',_e023,
 json_build_object('sub',_e023::text,'email','jerome.concepcion@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'sheila.ramos@premiumoutlets.com.ph',_e024,
 json_build_object('sub',_e024::text,'email','sheila.ramos@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now()),
(gen_random_uuid(),'alvin.gutierrez@premiumoutlets.com.ph',_e025,
 json_build_object('sub',_e025::text,'email','alvin.gutierrez@premiumoutlets.com.ph','email_verified',true,'provider','email')::jsonb,
 'email',now(),now(),now())

ON CONFLICT (provider_id, provider) DO NOTHING;

-- ── 3f. Disable force-password-change for all demo accounts ─────────────────
UPDATE public.profiles
SET    must_change_password = false,
       profile_complete     = true
WHERE  id IN (
    _u001,_u002,_u003,_u004,_u006,_u007,_u008,_u009,_u010,_u011,
    _e001,_e002,_e003,_e004,_e005,_e006,_e007,_e008,_e009,_e010,
    _e011,_e012,_e013,_e014,_e015,_e016,_e017,_e018,_e019,_e020,
    _e021,_e022,_e023,_e024,_e025
);

-- ── 4. Employee Records ───────────────────────────────────────────────────────
INSERT INTO public.employees (
    id, profile_id, name, email, role, department, status, work_type,
    salary, join_date, productivity, location,
    phone, birthday, team_leader,
    pin, nfc_id, biometric_id,
    pay_frequency, work_days, whatsapp_number, preferred_channel,
    address, emergency_contact
) VALUES

-- ── System / role-linked employees ───────────────────────────────────────────
('EMP-ADMIN',_u001,'Alex Rivera','admin@premiumoutlets.com.ph',
 'admin','Management','active','WFO',
 150000,'2020-01-01',95,'Manila, Metro Manila',
 '+63-917-5550101','1985-09-15',NULL,
 NULL,NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 'Manila, Metro Manila',NULL),

('EMP-HR',_u002,'Jordan Lee','hr@premiumoutlets.com.ph',
 'hr','Human Resources','active','WFO',
 95000,'2020-01-01',90,'Manila, Metro Manila',
 '+63-917-5550102','1987-03-20',NULL,
 NULL,NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 'Manila, Metro Manila',NULL),

('EMP-FINANCE',_u003,'Morgan Chen','finance@premiumoutlets.com.ph',
 'finance','Finance','active','WFO',
 100000,'2020-01-01',92,'Manila, Metro Manila',
 '+63-917-5550103','1988-07-11',NULL,
 NULL,NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 'Manila, Metro Manila',NULL),

('EMP-SUPV',_u006,'Pat Reyes','supervisor@premiumoutlets.com.ph',
 'supervisor','Operations','active','HYBRID',
 85000,'2021-06-01',88,'Manila, Metro Manila',
 '+63-917-5550104','1989-12-05',NULL,
 NULL,NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 'Manila, Metro Manila',NULL),

('EMP-PAYROLL-ADMIN',_u007,'Dana Cruz','payroll@premiumoutlets.com.ph',
 'payroll_admin','Finance','active','WFO',
 90000,'2021-01-01',91,'Manila, Metro Manila',
 '+63-917-5550105','1990-04-18',NULL,
 NULL,NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 'Manila, Metro Manila',NULL),

('EMP-AUDITOR',_u008,'Rene Santos','auditor@premiumoutlets.com.ph',
 'auditor','Management','active','WFO',
 88000,'2022-03-01',89,'Manila, Metro Manila',
 '+63-917-5550106','1991-08-22',NULL,
 NULL,NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 'Manila, Metro Manila',NULL),

('EMP026',_u004,'Sam Torres','employee@premiumoutlets.com.ph',
 'employee','Engineering','active','WFO',
 88000,'2024-01-10',82,'Manila, Metro Manila',
 '+63-917-5550126','1995-04-20','EMP003',
 '262626','NFC-026',NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],'+63-917-5550126','in_app',
 '88 Rizal Avenue, Malate, Manila, Metro Manila',
 'Maria Torres (Mother) - +63-918-5550001'),

('EMP027',_u009,'Jamie Reyes','qr@premiumoutlets.com.ph',
 'employee','Operations','active','ONSITE',
 45000,'2025-03-15',88,'Marikina, Metro Manila',
 '+63-917-1234567','1998-05-22',NULL,
 NULL,NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],'+63-917-1234567','in_app',
 '123 Shoe Ave, Marikina City, Metro Manila',
 'Maria Reyes - +63-918-7654321'),

('EMP028',_u010,'Riley Santos','qr2@premiumoutlets.com.ph',
 'employee','Operations','active','ONSITE',
 42000,'2025-06-01',82,'Quezon City, Metro Manila',
 '+63-918-9876543','1999-11-08',NULL,
 NULL,NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],'+63-918-9876543','in_app',
 '456 Commonwealth Ave, Quezon City, Metro Manila',
 'Carlos Santos - +63-919-1112222'),

('EMP029',_u011,'Alex Reyes','face@premiumoutlets.com.ph',
 'employee','Operations','active','ONSITE',
 52000,'2025-01-15',90,'Makati, Metro Manila',
 '+63-917-5550029','1993-07-14',NULL,
 '290290','NFC-029',NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],'+63-917-5550029','in_app',
 '29 Dela Rosa Street, Legazpi Village, Makati City, Metro Manila',
 'Rosa Reyes (Mother) - +63-918-5550029'),

-- ── EMP001–EMP025 ─────────────────────────────────────────────────────────────
('EMP001',_e001,'Miguel Antonio Santos','miguel.santos@premiumoutlets.com.ph',
 'employee','Engineering','active','HYBRID',
 85000,'2022-03-10',91,'Makati City, Metro Manila',
 '+63-917-501-0001','1993-06-15','EMP003',
 NULL,NULL,'FACE-001',
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 'Unit 4B Regent Tower, Salcedo St, Legaspi Village, Makati City',
 'Rosa Santos (Mother) – +63-918-501-0001'),

('EMP002',_e002,'Andrea Mae Reyes','andrea.reyes@premiumoutlets.com.ph',
 'employee','Engineering','active','WFH',
 72000,'2022-08-01',88,'Quezon City, Metro Manila',
 '+63-917-501-0002','1995-11-23','EMP003',
 NULL,NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 '45 Mabini St, Teachers Village, Quezon City',
 'Carlos Reyes (Father) – +63-918-501-0002'),

('EMP003',_e003,'Kevin James Dela Cruz','kevin.delacruz@premiumoutlets.com.ph',
 'employee','Engineering','active','HYBRID',
 92000,'2021-05-20',93,'Pasig City, Metro Manila',
 '+63-917-501-0003','1991-08-07',NULL,
 NULL,NULL,'FACE-003',
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 'Blk 12 Lot 4 Green Meadows Ave, Pasig City',
 'Linda Dela Cruz (Mother) – +63-918-501-0003'),

('EMP004',_e004,'Diana Rose Bautista','diana.bautista@premiumoutlets.com.ph',
 'employee','Engineering','active','WFH',
 68000,'2023-01-09',85,'Mandaluyong City, Metro Manila',
 '+63-917-501-0004','1996-04-12','EMP003',
 NULL,'NFC-004',NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 '1503 Wack-Wack Condo, Shaw Blvd, Mandaluyong City',
 'Eduardo Bautista (Father) – +63-918-501-0004'),

('EMP005',_e005,'Joshua Paul Mendoza','joshua.mendoza@premiumoutlets.com.ph',
 'employee','Engineering','active','WFO',
 52000,'2023-06-15',82,'Taguig City, Metro Manila',
 '+63-917-501-0005','1997-02-28','EMP003',
 '050505',NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 'Flat 2A One Bonifacio High St, BGC, Taguig City',
 'Lina Mendoza (Mother) – +63-918-501-0005'),

('EMP006',_e006,'Joselito Rafael Cruz','joselito.cruz@premiumoutlets.com.ph',
 'employee','Human Resources','active','WFO',
 80000,'2021-02-01',90,'Makati City, Metro Manila',
 '+63-917-501-0006','1989-03-22',NULL,
 NULL,NULL,'FACE-006',
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 '8 Jupiter Street, Bel-Air, Makati City',
 'Carmen Cruz (Wife) – +63-918-501-0006'),

('EMP007',_e007,'Camille Joy Garcia','camille.garcia@premiumoutlets.com.ph',
 'employee','Design','active','HYBRID',
 65000,'2022-10-03',87,'Pasig City, Metro Manila',
 '+63-917-501-0007','1995-09-18',NULL,
 NULL,NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 '2205 Cityland Pasig, C. Raymundo Ave, Pasig City',
 'Mario Garcia (Father) – +63-918-501-0007'),

('EMP008',_e008,'Maricel Grace Padilla','maricel.padilla@premiumoutlets.com.ph',
 'employee','Marketing','active','HYBRID',
 70000,'2021-11-15',88,'Quezon City, Metro Manila',
 '+63-917-501-0008','1990-12-05',NULL,
 NULL,NULL,'FACE-008',
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 '35 Maginhawa St, Teachers Village, Quezon City',
 'Roberto Padilla (Husband) – +63-918-501-0008'),

('EMP009',_e009,'Melissa Anne Fernandez','melissa.fernandez@premiumoutlets.com.ph',
 'employee','Finance','active','WFO',
 55000,'2022-07-11',89,'Ortigas Center, Pasig City',
 '+63-917-501-0009','1993-05-30',NULL,
 NULL,'NFC-009',NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 'Tower 1 Robinsons Equitable, Ortigas Center, Pasig City',
 'Pablo Fernandez (Father) – +63-918-501-0009'),

('EMP010',_e010,'Bernard Emmanuel Aquino','bernard.aquino@premiumoutlets.com.ph',
 'employee','Finance','active','WFO',
 72000,'2020-09-14',92,'Makati City, Metro Manila',
 '+63-917-501-0010','1988-07-04',NULL,
 NULL,NULL,'FACE-010',
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 'Lot 7 Sta. Rosa Street, San Lorenzo Village, Makati City',
 'Gloria Aquino (Wife) – +63-918-501-0010'),

('EMP011',_e011,'Antonio Jose Ramos','antonio.ramos@premiumoutlets.com.ph',
 'employee','Human Resources','active','WFO',
 40000,'2023-04-03',81,'Mandaluyong City, Metro Manila',
 '+63-917-501-0011','1995-10-17','EMP006',
 '111111',NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 '12B Lourdes St, Highway Hills, Mandaluyong City',
 'Nora Ramos (Mother) – +63-918-501-0011'),

('EMP012',_e012,'Eduardo Felipe Magbanua','eduardo.magbanua@premiumoutlets.com.ph',
 'employee','Operations','active','ONSITE',
 38000,'2024-01-15',83,'Marikina City, Metro Manila',
 '+63-917-501-0012','1994-03-21','EMP008',
 NULL,NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 '7 Shoe Ave, Concepcion Uno, Marikina City',
 'Fe Magbanua (Wife) – +63-918-501-0012'),

('EMP013',_e013,'Cynthia Grace Santiago','cynthia.santiago@premiumoutlets.com.ph',
 'employee','Human Resources','active','WFO',
 28000,'2024-03-01',79,'Makati City, Metro Manila',
 '+63-917-501-0013','1998-07-09','EMP006',
 NULL,'NFC-013',NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 'Unit 201 Antel Corporate Centre, Valero St, Makati City',
 'Teresita Santiago (Mother) – +63-918-501-0013'),

('EMP014',_e014,'Ferdinand Mark Cabral','ferdinand.cabral@premiumoutlets.com.ph',
 'employee','Operations','active','ONSITE',
 35000,'2023-08-22',84,'Caloocan City, Metro Manila',
 '+63-917-501-0014','1991-01-14','EMP008',
 '141414',NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Sat'],NULL,'in_app',
 'Blk 4 Lot 9 Gen. San Miguel St, Sangandaan, Caloocan City',
 'Marites Cabral (Wife) – +63-918-501-0014'),

('EMP015',_e015,'Nora Luz Dizon','nora.dizon@premiumoutlets.com.ph',
 'employee','Operations','active','WFO',
 22000,'2024-06-10',76,'Malabon City, Metro Manila',
 '+63-917-501-0015','2000-05-25','EMP008',
 NULL,NULL,NULL,
 'bi_weekly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 '123 F. Sevilla Blvd, Longos, Malabon City',
 'Domingo Dizon (Father) – +63-918-501-0015'),

('EMP016',_e016,'Rafael Miguel Torres','rafael.torres@premiumoutlets.com.ph',
 'employee','Design','active','HYBRID',
 45000,'2023-09-04',85,'Las Pinas City, Metro Manila',
 '+63-917-501-0016','1994-11-30','EMP007',
 '161616',NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 '22 Marcos Alvarez Ave, Talon Dos, Las Pinas City',
 'Leonora Torres (Mother) – +63-918-501-0016'),

('EMP017',_e017,'Patricia Anne Villanueva','patricia.villanueva@premiumoutlets.com.ph',
 'employee','Engineering','active','WFH',
 32000,'2025-01-06',77,'Paranaque City, Metro Manila',
 '+63-917-501-0017','2000-09-03','EMP003',
 NULL,NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 '10 Moonwalk Rd, BF Homes, Paranaque City',
 'Vicente Villanueva (Father) – +63-918-501-0017'),

('EMP018',_e018,'Ryan Patrick Evangelista','ryan.evangelista@premiumoutlets.com.ph',
 'employee','Marketing','active','HYBRID',
 48000,'2023-07-17',86,'Quezon City, Metro Manila',
 '+63-917-501-0018','1996-06-14','EMP008',
 NULL,NULL,'FACE-018',
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 '88 Timog Avenue, Sacred Heart, Quezon City',
 'Rosario Evangelista (Mother) – +63-918-501-0018'),

('EMP019',_e019,'Emmanuel Rey Santos','emmanuel.santos@premiumoutlets.com.ph',
 'employee','Sales','active','WFO',
 68000,'2021-07-12',91,'Makati City, Metro Manila',
 '+63-917-501-0019','1990-04-02',NULL,
 NULL,NULL,'FACE-019',
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 '10 Kamagong St, San Antonio Village, Makati City',
 'Elena Santos (Wife) – +63-918-501-0019'),

('EMP020',_e020,'Rowena Grace Castillo','rowena.castillo@premiumoutlets.com.ph',
 'employee','Sales','active','WFO',
 52000,'2022-04-25',87,'Pasay City, Metro Manila',
 '+63-917-501-0020','1993-08-19','EMP019',
 NULL,'NFC-020',NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 '221 Tramo Street, Pasay City',
 'Alfredo Castillo (Father) – +63-918-501-0020'),

('EMP021',_e021,'Ronaldo James Dizon','ronaldo.dizon@premiumoutlets.com.ph',
 'employee','Sales','active','WFO',
 38000,'2024-02-19',80,'Caloocan City, Metro Manila',
 '+63-917-501-0021','1997-12-11','EMP019',
 NULL,NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 '156 A. Mabini St, Sangandaan, Caloocan City',
 'Lydia Dizon (Mother) – +63-918-501-0021'),

('EMP022',_e022,'Maria Lourdes Pascual','maria.pascual@premiumoutlets.com.ph',
 'employee','Sales','active','WFO',
 30000,'2024-05-06',78,'Las Pinas City, Metro Manila',
 '+63-917-501-0022','1999-02-07','EMP019',
 '222222',NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 '45 Real St, Pamplona Uno, Las Pinas City',
 'Renato Pascual (Father) – +63-918-501-0022'),

('EMP023',_e023,'Jerome Carlo Concepcion','jerome.concepcion@premiumoutlets.com.ph',
 'employee','Engineering','active','WFO',
 42000,'2023-10-30',82,'Taguig City, Metro Manila',
 '+63-917-501-0023','1995-07-26',NULL,
 NULL,'NFC-023',NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 'Block 3 Phase 2 Western Bicutan, Taguig City',
 'Josefa Concepcion (Mother) – +63-918-501-0023'),

('EMP024',_e024,'Sheila Marie Ramos','sheila.ramos@premiumoutlets.com.ph',
 'employee','Finance','active','WFO',
 48000,'2023-02-13',86,'Makati City, Metro Manila',
 '+63-917-501-0024','1994-10-08','EMP010',
 NULL,NULL,'FACE-024',
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 '2108 Dela Rosa St, Legaspi Village, Makati City',
 'Antonio Ramos (Father) – +63-918-501-0024'),

('EMP025',_e025,'Alvin Jose Gutierrez','alvin.gutierrez@premiumoutlets.com.ph',
 'employee','Human Resources','active','WFO',
 32000,'2024-08-12',77,'Quezon City, Metro Manila',
 '+63-917-501-0025','2000-03-14','EMP006',
 NULL,NULL,NULL,
 'semi_monthly',ARRAY['Mon','Tue','Wed','Thu','Fri'],NULL,'in_app',
 '89 Batangas St, Sta. Mesa Heights, Quezon City',
 'Corazon Gutierrez (Mother) – +63-918-501-0025')

ON CONFLICT (id) DO NOTHING;

-- ── 5. Update department heads now that employees exist ───────────────────────
UPDATE public.departments SET head_id = 'EMP003' WHERE id = 'DEPT-ENG';
UPDATE public.departments SET head_id = 'EMP006' WHERE id = 'DEPT-HR';
UPDATE public.departments SET head_id = 'EMP010' WHERE id = 'DEPT-FIN';
UPDATE public.departments SET head_id = 'EMP008' WHERE id = 'DEPT-MKT';
UPDATE public.departments SET head_id = 'EMP007' WHERE id = 'DEPT-DES';
UPDATE public.departments SET head_id = 'EMP-SUPV' WHERE id = 'DEPT-OPS';
UPDATE public.departments SET head_id = 'EMP019' WHERE id = 'DEPT-SLS';
UPDATE public.departments SET head_id = 'EMP-ADMIN' WHERE id = 'DEPT-MGT';

END $$;

-- ─── 6. Final verification query ─────────────────────────────────────────────
-- Run this to confirm everything was inserted correctly:
--
-- SELECT
--     u.email,
--     p.role,
--     p.must_change_password,
--     e.id AS employee_id,
--     e.department
-- FROM auth.users u
-- LEFT JOIN public.profiles p ON p.id = u.id
-- LEFT JOIN public.employees e ON e.profile_id = u.id
-- WHERE u.email LIKE '%@premiumoutlets.com.ph'
-- ORDER BY p.role, u.email;
