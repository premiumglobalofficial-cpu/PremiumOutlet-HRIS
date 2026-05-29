-- 062_sa_commission.sql — POGRC SA commission & payroll integration (Phase 2)
-- Sales commission, OT, compliance score, store goal pool

-- ─── Employee SA profiles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sa_employee_profiles (
  employee_id text PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
  branch_id text NOT NULL DEFAULT 'main',
  employment_type text NOT NULL DEFAULT 'regular'
    CHECK (employment_type IN ('trainee', 'probationary', 'regular', 'oic')),
  is_sales_associate boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sa_profiles_branch ON public.sa_employee_profiles(branch_id);

-- ─── Monthly cycles (branch + month) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sa_monthly_cycles (
  id text PRIMARY KEY,
  month text NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  branch_id text NOT NULL,
  branch_total_sales numeric(14, 2) NOT NULL DEFAULT 0,
  compliance_earned jsonb NOT NULL DEFAULT '{}'::jsonb,
  compliance_deducted jsonb NOT NULL DEFAULT '{}'::jsonb,
  sales_by_employee jsonb NOT NULL DEFAULT '{}'::jsonb,
  ot_hours_by_employee jsonb NOT NULL DEFAULT '{}'::jsonb,
  kpi_by_employee jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sa_monthly_cycles_month_branch_unique UNIQUE (month, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_sa_cycles_month ON public.sa_monthly_cycles(month);

-- ─── Payout records per SA per cycle ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sa_payouts (
  id text PRIMARY KEY,
  cycle_id text NOT NULL REFERENCES public.sa_monthly_cycles(id) ON DELETE CASCADE,
  employee_id text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month text NOT NULL,
  branch_id text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'processed')),
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_by text,
  approved_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sa_payouts_cycle_employee_unique UNIQUE (cycle_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_sa_payouts_employee_month ON public.sa_payouts(employee_id, month);
CREATE INDEX IF NOT EXISTS idx_sa_payouts_status ON public.sa_payouts(status);

-- ─── Weekly compliance (optional granular entry) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.sa_compliance_weeks (
  id text PRIMARY KEY,
  cycle_id text NOT NULL REFERENCES public.sa_monthly_cycles(id) ON DELETE CASCADE,
  employee_id text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  week_number smallint NOT NULL CHECK (week_number BETWEEN 1 AND 5),
  earned jsonb NOT NULL DEFAULT '{}'::jsonb,
  deducted jsonb NOT NULL DEFAULT '{}'::jsonb,
  validated_by text,
  validated_at timestamptz,
  CONSTRAINT sa_compliance_weeks_unique UNIQUE (cycle_id, employee_id, week_number)
);

-- ─── SA OT approvals (cash / offset) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sa_ot_approvals (
  id text PRIMARY KEY,
  employee_id text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  hours numeric(4, 2) NOT NULL CHECK (hours > 0 AND hours <= 2),
  ot_type text NOT NULL CHECK (ot_type IN ('cash', 'offset')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sa_ot_approvals_employee_date_unique UNIQUE (employee_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_sa_ot_employee ON public.sa_ot_approvals(employee_id);

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.sa_employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sa_monthly_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sa_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sa_compliance_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sa_ot_approvals ENABLE ROW LEVEL SECURITY;

-- Admin / HR / finance full access
CREATE POLICY sa_profiles_admin ON public.sa_employee_profiles
  FOR ALL USING (public.is_admin_or_hr());

CREATE POLICY sa_cycles_admin ON public.sa_monthly_cycles
  FOR ALL USING (public.is_admin_or_hr());

CREATE POLICY sa_payouts_admin ON public.sa_payouts
  FOR ALL USING (public.is_admin_or_hr());

CREATE POLICY sa_compliance_admin ON public.sa_compliance_weeks
  FOR ALL USING (public.is_admin_or_hr());

CREATE POLICY sa_ot_admin ON public.sa_ot_approvals
  FOR ALL USING (public.is_admin_or_hr());

-- Employees: read own approved/processed payouts only
CREATE POLICY sa_payouts_read_own ON public.sa_payouts
  FOR SELECT USING (
    status IN ('approved', 'processed')
    AND employee_id IN (
      SELECT e.id FROM public.employees e WHERE e.profile_id = auth.uid()
    )
  );

CREATE POLICY sa_profiles_read_own ON public.sa_employee_profiles
  FOR SELECT USING (
    employee_id IN (
      SELECT e.id FROM public.employees e WHERE e.profile_id = auth.uid()
    )
  );
