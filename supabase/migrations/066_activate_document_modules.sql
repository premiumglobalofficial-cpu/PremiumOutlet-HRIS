-- 066: Activate Document Center modules (201 Files, Document Center, Disciplinary)
UPDATE public.appearance_config
SET module_flags = COALESCE(module_flags, '{}'::jsonb) || jsonb_build_object(
  'docs201', true,
  'documentCenter', true,
  'disciplinary', true
),
updated_at = now()
WHERE id = 'default';

-- Ensure row exists with flags if table was empty
INSERT INTO public.appearance_config (id, company_name, module_flags)
VALUES (
  'default',
  'Premium Outlets',
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
    'docs201', true,
    'documentCenter', true,
    'disciplinary', true,
    'vbirAlphaList', false
  )
)
ON CONFLICT (id) DO UPDATE
SET module_flags = COALESCE(public.appearance_config.module_flags, '{}'::jsonb) || jsonb_build_object(
  'docs201', true,
  'documentCenter', true,
  'disciplinary', true
),
updated_at = now();
