ALTER TABLE public.appearance_config
ADD COLUMN IF NOT EXISTS module_flags jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.appearance_config
SET module_flags = COALESCE(module_flags, '{}'::jsonb)
WHERE module_flags IS NULL OR module_flags = '{}'::jsonb;

INSERT INTO public.appearance_config (id, company_name, module_flags)
VALUES (
  'default',
  'NexHRMS',
  jsonb_build_object(
    'attendance', true,
    'leave', true,
    'payroll', true,
    'myPayslips', true,
    'loans', true,
    'projects', true,
    'reports', true,
    'timesheets', true,
    'kiosk', true,
    'notifications', true,
    'audit', true,
    'directory', true,
    'tasks', true,
    'messages', true,
    'events', true,
    'jobs', false,
    'docs201', false,
    'documentCenter', false,
    'disciplinary', false,
    'vbirAlphaList', false
  )
)
ON CONFLICT (id) DO UPDATE
SET module_flags = EXCLUDED.module_flags,
    updated_at = now();