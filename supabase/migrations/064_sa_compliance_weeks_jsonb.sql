-- 064: persist weekly compliance grid on monthly cycles (JSONB)
ALTER TABLE public.sa_monthly_cycles
  ADD COLUMN IF NOT EXISTS compliance_weeks_by_employee jsonb NOT NULL DEFAULT '{}'::jsonb;
