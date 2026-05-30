-- 065: persist OT approval logs on monthly cycles (JSONB)
ALTER TABLE public.sa_monthly_cycles
  ADD COLUMN IF NOT EXISTS ot_approvals_by_employee jsonb NOT NULL DEFAULT '{}'::jsonb;
