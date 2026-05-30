-- 067: Premium Outlets branding — company name + default logo path
UPDATE public.appearance_config
SET
  company_name = 'Premium Outlets',
  company_logo = '/logo.jpg',
  login_heading = COALESCE(NULLIF(login_heading, ''), 'Premium Outlets HRIS'),
  updated_at = now()
WHERE id = 'default'
  AND (company_name IS NULL OR company_name IN ('NexHRMS', 'NexHRMS Inc.'));

UPDATE public.appearance_config
SET
  company_logo = '/logo.jpg',
  updated_at = now()
WHERE id = 'default'
  AND (company_logo IS NULL OR company_logo IN ('/logo.png', '/darklogo.png', '/logo.svg'));

INSERT INTO public.appearance_config (id, company_name, company_logo, login_heading)
VALUES ('default', 'Premium Outlets', '/logo.jpg', 'Premium Outlets HRIS')
ON CONFLICT (id) DO UPDATE
SET
  company_name = EXCLUDED.company_name,
  company_logo = COALESCE(NULLIF(public.appearance_config.company_logo, ''), EXCLUDED.company_logo),
  login_heading = COALESCE(NULLIF(public.appearance_config.login_heading, ''), EXCLUDED.login_heading),
  updated_at = now();
