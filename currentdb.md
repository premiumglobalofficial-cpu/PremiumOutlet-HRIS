## Table `alphalist_exports`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `year` | `int4` |  |
| `schedule_type` | `text` |  |
| `generated_at` | `timestamptz` |  |
| `generated_by` | `text` |  Nullable |
| `employee_count` | `int4` |  |
| `total_taxable_comp` | `numeric` |  |
| `total_tax_withheld` | `numeric` |  |
| `validation_status` | `text` |  |
| `validation_errors` | `jsonb` |  Nullable |
| `export_format` | `text` |  |
| `file_url` | `text` |  Nullable |
| `efps_status` | `text` |  |
| `submitted_at` | `timestamptz` |  Nullable |
| `submitted_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `announcements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `subject` | `text` |  |
| `body` | `text` |  |
| `channel` | `text` |  |
| `scope` | `text` |  |
| `target_employee_ids` | `_text` |  Nullable |
| `target_group_id` | `text` |  Nullable |
| `target_task_id` | `text` |  Nullable |
| `sent_by` | `text` |  |
| `sent_at` | `timestamptz` |  |
| `status` | `text` |  |
| `read_by` | `_text` |  |
| `attachment_url` | `text` |  Nullable |

## Table `annual_tax_summaries`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `year` | `int4` |  |
| `total_taxable_comp` | `numeric` |  |
| `total_non_taxable_comp` | `numeric` |  |
| `total_de_minimis` | `numeric` |  |
| `total_sss` | `numeric` |  |
| `total_philhealth` | `numeric` |  |
| `total_pagibig` | `numeric` |  |
| `total_13th_non_taxable` | `numeric` |  |
| `total_13th_taxable` | `numeric` |  |
| `total_other_benefits` | `numeric` |  |
| `total_tax_withheld` | `numeric` |  |
| `prev_employer_income` | `numeric` |  |
| `prev_employer_tax` | `numeric` |  |
| `annual_tax_due` | `numeric` |  Nullable |
| `adjustment_type` | `text` |  Nullable |
| `adjustment_amount` | `numeric` |  Nullable |
| `status` | `text` |  |
| `finalized_at` | `timestamptz` |  Nullable |
| `finalized_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `appearance_config`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `company_name` | `text` |  |
| `company_logo` | `text` |  Nullable |
| `sidebar_color` | `text` |  Nullable |
| `primary_color` | `text` |  Nullable |
| `login_heading` | `text` |  Nullable |
| `login_sub_heading` | `text` |  Nullable |
| `login_background` | `text` |  Nullable |
| `login_logo` | `text` |  Nullable |
| `module_flags` | `jsonb` |  |
| `updated_at` | `timestamptz` |  |

## Table `attendance_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `event_type` | `text` |  |
| `timestamp_utc` | `timestamptz` |  |
| `project_id` | `text` |  Nullable |
| `device_id` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `attendance_evidence`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `event_id` | `text` |  |
| `gps_lat` | `float8` |  Nullable |
| `gps_lng` | `float8` |  Nullable |
| `gps_accuracy_meters` | `float8` |  Nullable |
| `geofence_pass` | `bool` |  Nullable |
| `qr_token_id` | `text` |  Nullable |
| `device_integrity_result` | `text` |  Nullable |
| `face_verified` | `bool` |  Nullable |
| `mock_location_detected` | `bool` |  Nullable |

## Table `attendance_exceptions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `event_id` | `text` |  Nullable |
| `employee_id` | `text` |  |
| `date` | `date` |  |
| `flag` | `text` |  |
| `auto_generated` | `bool` |  |
| `resolved_at` | `timestamptz` |  Nullable |
| `resolved_by` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `attendance_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `date` | `date` |  |
| `check_in` | `text` |  Nullable |
| `check_out` | `text` |  Nullable |
| `hours` | `numeric` |  Nullable |
| `status` | `text` |  |
| `project_id` | `text` |  Nullable |
| `location_lat` | `float8` |  Nullable |
| `location_lng` | `float8` |  Nullable |
| `face_verified` | `bool` |  Nullable |
| `late_minutes` | `int4` |  Nullable |
| `shift_id` | `text` |  Nullable |
| `flags` | `_text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `attendance_rule_sets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `name` | `text` |  |
| `standard_hours_per_day` | `numeric` |  |
| `grace_minutes` | `int4` |  |
| `rounding_policy` | `text` |  |
| `overtime_requires_approval` | `bool` |  |
| `night_diff_start` | `text` |  Nullable |
| `night_diff_end` | `text` |  Nullable |
| `holiday_multiplier` | `numeric` |  |
| `ot_multiplier_regular` | `numeric` |  |
| `ot_multiplier_rest_day` | `numeric` |  |
| `ot_multiplier_special_holiday` | `numeric` |  |
| `ot_multiplier_regular_holiday` | `numeric` |  |
| `ot_multiplier_night_diff` | `numeric` |  |

## Table `audit_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `entity_type` | `text` |  |
| `entity_id` | `text` |  |
| `action` | `text` |  |
| `performed_by` | `text` |  |
| `timestamp` | `timestamptz` |  |
| `reason` | `text` |  Nullable |
| `before_snapshot` | `jsonb` |  Nullable |
| `after_snapshot` | `jsonb` |  Nullable |

## Table `biometric_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `biometric_id` | `text` |  Nullable |
| `device_id` | `text` |  Nullable |
| `action` | `text` |  Nullable |
| `payload` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `biometric_templates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `biometric_id` | `text` |  Unique |
| `employee_id` | `text` |  Nullable |
| `name` | `text` |  Nullable |
| `privilege` | `int4` |  Nullable |
| `password` | `text` |  Nullable |
| `card_no` | `text` |  Nullable |
| `finger_template` | `text` |  Nullable |
| `face_template` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `break_records`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `date` | `date` |  |
| `break_type` | `text` |  |
| `start_time` | `text` |  |
| `end_time` | `text` |  Nullable |
| `start_lat` | `float8` |  Nullable |
| `start_lng` | `float8` |  Nullable |
| `end_lat` | `float8` |  Nullable |
| `end_lng` | `float8` |  Nullable |
| `end_geofence_pass` | `bool` |  Nullable |
| `distance_from_site` | `float8` |  Nullable |
| `duration` | `int4` |  Nullable |
| `overtime` | `bool` |  Nullable |

## Table `calendar_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `title` | `text` |  |
| `time` | `text` |  |
| `date` | `date` |  |
| `type` | `text` |  Nullable |

## Table `channel_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `channel_id` | `text` |  |
| `employee_id` | `text` |  |
| `message` | `text` |  |
| `attachment_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `edited_at` | `timestamptz` |  Nullable |
| `read_by` | `_text` |  |

## Table `companies`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `name` | `text` |  |
| `slug` | `text` |  Unique |
| `metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `custom_pages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `title` | `text` |  |
| `slug` | `text` |  Unique |
| `icon` | `text` |  |
| `description` | `text` |  Nullable |
| `allowed_roles` | `_text` |  |
| `widgets` | `jsonb` |  |
| `show_in_sidebar` | `bool` |  |
| `order` | `int4` |  |
| `created_at` | `timestamptz` |  |

## Table `dashboard_layouts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `role_id` | `text` | Primary |
| `widgets` | `jsonb` |  |
| `updated_at` | `timestamptz` |  |

## Table `deduction_global_defaults`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `deduction_type` | `text` |  Unique |
| `enabled` | `bool` |  |
| `mode` | `text` |  |
| `percentage` | `numeric` |  Nullable |
| `fixed_amount` | `numeric` |  Nullable |
| `notes` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  |
| `updated_by` | `text` |  Nullable |

## Table `deduction_overrides`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `deduction_type` | `text` |  |
| `mode` | `text` |  |
| `percentage` | `numeric` |  Nullable |
| `fixed_amount` | `numeric` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `updated_by` | `text` |  Nullable |

## Table `deduction_templates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `name` | `text` |  |
| `type` | `text` |  |
| `calculation_mode` | `text` |  |
| `value` | `numeric` |  |
| `conditions` | `jsonb` |  Nullable |
| `applies_to_all` | `bool` |  |
| `is_active` | `bool` |  |
| `created_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `departments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `name` | `text` |  Unique |
| `description` | `text` |  Nullable |
| `head_id` | `text` |  Nullable |
| `color` | `text` |  |
| `is_active` | `bool` |  |
| `created_by` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `disciplinary_cases`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `case_number` | `text` |  Unique |
| `employee_id` | `text` |  |
| `violation_type` | `text` |  |
| `policy_reference` | `text` |  Nullable |
| `incident_date` | `timestamptz` |  |
| `incident_location` | `text` |  Nullable |
| `description` | `text` |  |
| `evidence_urls` | `jsonb` |  |
| `status` | `text` |  |
| `assigned_hr` | `text` |  Nullable |
| `created_by` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `employee_201_documents`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `document_type` | `text` |  |
| `document_title` | `text` |  |
| `file_path` | `text` |  Nullable |
| `file_type` | `text` |  Nullable |
| `file_size` | `int8` |  Nullable |
| `status` | `text` |  |
| `visibility` | `text` |  |
| `expiry_date` | `date` |  Nullable |
| `remarks` | `text` |  Nullable |
| `uploaded_by` | `text` |  Nullable |
| `reviewed_by` | `text` |  Nullable |
| `reviewed_at` | `timestamptz` |  Nullable |
| `case_id` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `employee_deduction_assignments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `template_id` | `text` |  |
| `override_value` | `numeric` |  Nullable |
| `effective_from` | `date` |  |
| `effective_until` | `date` |  Nullable |
| `is_active` | `bool` |  |
| `assigned_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `employee_documents`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `name` | `text` |  |
| `file_url` | `text` |  Nullable |
| `uploaded_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `employee_shifts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `employee_id` | `text` | Primary |
| `shift_id` | `text` |  |
| `assigned_at` | `timestamptz` |  |

## Table `employee_tax_profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  Unique |
| `tin` | `text` |  Nullable |
| `employment_classification` | `text` |  |
| `is_mwe` | `bool` |  |
| `mwe_daily_rate` | `numeric` |  Nullable |
| `substituted_filing` | `bool` |  |
| `tax_status` | `text` |  |
| `tax_residency` | `text` |  |
| `prev_employer_tin` | `text` |  Nullable |
| `prev_employer_name` | `text` |  Nullable |
| `prev_income` | `numeric` |  Nullable |
| `prev_tax_withheld` | `numeric` |  Nullable |
| `prev_2316_received` | `bool` |  |
| `separation_date` | `date` |  Nullable |
| `separation_type` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `employees`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `profile_id` | `uuid` |  Nullable Unique |
| `name` | `text` |  |
| `email` | `text` |  |
| `role` | `text` |  |
| `department` | `text` |  |
| `status` | `text` |  |
| `work_type` | `text` |  |
| `salary` | `numeric` |  |
| `join_date` | `date` |  |
| `productivity` | `int4` |  |
| `location` | `text` |  |
| `phone` | `text` |  Nullable |
| `birthday` | `date` |  Nullable |
| `team_leader` | `text` |  Nullable |
| `avatar_url` | `text` |  Nullable |
| `pin` | `text` |  Nullable |
| `nfc_id` | `text` |  Nullable |
| `resigned_at` | `timestamptz` |  Nullable |
| `shift_id` | `text` |  Nullable |
| `pay_frequency` | `text` |  Nullable |
| `work_days` | `_text` |  Nullable |
| `whatsapp_number` | `text` |  Nullable |
| `preferred_channel` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `emergency_contact` | `text` |  Nullable |
| `address` | `text` |  Nullable |
| `job_title` | `text` |  Nullable |
| `deduction_exempt` | `bool` |  |
| `deduction_exempt_reason` | `text` |  Nullable |
| `notification_preferences` | `jsonb` |  |
| `biometric_id` | `text` |  Nullable |
| `tin` | `text` |  Nullable |
| `employment_classification` | `text` |  |
| `is_mwe` | `bool` |  |
| `mwe_daily_rate` | `numeric` |  Nullable |
| `substituted_filing` | `bool` |  |
| `tax_status` | `text` |  |
| `tax_residency` | `text` |  |
| `separation_date` | `date` |  Nullable |
| `separation_type` | `text` |  Nullable |

## Table `face_enrollments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  Unique |
| `face_template_hash` | `text` |  |
| `enrollment_date` | `timestamptz` |  |
| `last_verified` | `timestamptz` |  Nullable |
| `verification_count` | `int4` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `enrolled_by` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `embedding` | `jsonb` |  Nullable |
| `reference_image` | `text` |  Nullable |

## Table `final_pay_computations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `resigned_at` | `date` |  |
| `pro_rated_salary` | `numeric` |  |
| `unpaid_ot` | `numeric` |  |
| `leave_payout` | `numeric` |  |
| `remaining_loan_balance` | `numeric` |  |
| `gross_final_pay` | `numeric` |  |
| `deductions` | `numeric` |  |
| `net_final_pay` | `numeric` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `payslip_id` | `text` |  Nullable |

## Table `form_2316_records`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `year` | `int4` |  |
| `annual_summary_id` | `text` |  Nullable |
| `generated_at` | `timestamptz` |  |
| `generated_by` | `text` |  Nullable |
| `employer_signed_at` | `timestamptz` |  Nullable |
| `employer_signed_by` | `text` |  Nullable |
| `employer_signature_url` | `text` |  Nullable |
| `employee_signed_at` | `timestamptz` |  Nullable |
| `employee_signature_url` | `text` |  Nullable |
| `pdf_url` | `text` |  Nullable |
| `document_hash` | `text` |  Nullable |
| `status` | `text` |  |
| `released_at` | `timestamptz` |  Nullable |
| `downloaded_at` | `timestamptz` |  Nullable |
| `downloaded_by` | `text` |  Nullable |
| `revoked_at` | `timestamptz` |  Nullable |
| `revoked_by` | `text` |  Nullable |
| `revoke_reason` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `gov_table_versions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `table_name` | `text` |  |
| `version` | `text` |  |
| `effective_date` | `date` |  |
| `snapshot_json` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `holidays`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `name` | `text` |  |
| `date` | `date` |  |
| `type` | `text` |  |
| `multiplier` | `numeric` |  |
| `is_custom` | `bool` |  |
| `created_at` | `timestamptz` |  |

## Table `job_applications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `job_id` | `text` |  |
| `applicant_name` | `text` |  |
| `applicant_email` | `text` |  |
| `applicant_phone` | `text` |  Nullable |
| `resume_url` | `text` |  Nullable |
| `cover_letter` | `text` |  Nullable |
| `source` | `text` |  |
| `status` | `text` |  |
| `interview_date` | `timestamptz` |  Nullable |
| `offer_salary` | `numeric` |  Nullable |
| `notes` | `text` |  Nullable |
| `reviewed_by` | `text` |  Nullable |
| `reviewed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `job_postings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `title` | `text` |  |
| `department` | `text` |  |
| `location` | `text` |  |
| `type` | `text` |  |
| `status` | `text` |  |
| `priority` | `text` |  |
| `headcount` | `int4` |  |
| `salary_min` | `numeric` |  Nullable |
| `salary_max` | `numeric` |  Nullable |
| `description` | `text` |  |
| `requirements` | `text` |  |
| `responsibilities` | `text` |  |
| `deadline` | `date` |  Nullable |
| `created_by` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `job_titles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `name` | `text` |  Unique |
| `description` | `text` |  Nullable |
| `department` | `text` |  Nullable |
| `is_active` | `bool` |  |
| `is_lead` | `bool` |  |
| `color` | `text` |  |
| `created_by` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `kiosk_config`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `kiosk_enabled` | `bool` |  |
| `kiosk_title` | `text` |  |
| `welcome_message` | `text` |  |
| `footer_message` | `text` |  |
| `check_in_method` | `text` |  |
| `enable_pin` | `bool` |  |
| `enable_qr` | `bool` |  |
| `enable_face` | `bool` |  |
| `enable_nfc` | `bool` |  |
| `allow_check_out` | `bool` |  |
| `pin_length` | `int4` |  |
| `max_pin_attempts` | `int4` |  |
| `lockout_duration` | `int4` |  |
| `token_refresh_interval` | `int4` |  |
| `token_length` | `int4` |  |
| `nfc_simulated_delay` | `int4` |  |
| `kiosk_theme` | `text` |  |
| `clock_format` | `text` |  |
| `show_clock` | `bool` |  |
| `show_date` | `bool` |  |
| `show_logo` | `bool` |  |
| `show_device_id` | `bool` |  |
| `show_security_badge` | `bool` |  |
| `feedback_duration` | `int4` |  |
| `warn_off_day` | `bool` |  |
| `play_sound` | `bool` |  |
| `idle_timeout` | `int4` |  |
| `idle_action` | `text` |  |
| `require_geofence` | `bool` |  |
| `selfie_enabled` | `bool` |  |
| `selfie_required` | `bool` |  |
| `face_rec_enabled` | `bool` |  |
| `face_rec_required` | `bool` |  |
| `face_rec_auto_start` | `bool` |  |
| `face_rec_countdown` | `int4` |  |
| `face_rec_position` | `text` |  |
| `dev_options_penalty_enabled` | `bool` |  |
| `dev_options_penalty_minutes` | `int4` |  |
| `dev_options_penalty_apply_to` | `text` |  |
| `dev_options_penalty_notify_admin` | `bool` |  |
| `updated_at` | `timestamptz` |  |

## Table `kiosk_devices`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `name` | `text` |  |
| `registered_at` | `timestamptz` |  |
| `project_id` | `text` |  Nullable |
| `is_active` | `bool` |  |

## Table `kiosk_pins`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `kiosk_device_id` | `text` |  Nullable Unique |
| `pin_hash` | `text` |  |
| `created_by` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |
| `last_used_at` | `timestamptz` |  Nullable |
| `is_active` | `bool` |  Nullable |

## Table `leave_balances`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `leave_type` | `text` |  |
| `year` | `int4` |  |
| `entitled` | `numeric` |  |
| `used` | `numeric` |  |
| `carried_forward` | `numeric` |  |
| `remaining` | `numeric` |  |
| `last_accrued_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  |

## Table `leave_policies`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `leave_type` | `text` |  |
| `name` | `text` |  |
| `accrual_frequency` | `text` |  |
| `annual_entitlement` | `int4` |  |
| `carry_forward_allowed` | `bool` |  |
| `max_carry_forward` | `int4` |  |
| `max_balance` | `int4` |  |
| `expiry_months` | `int4` |  |
| `negative_leave_allowed` | `bool` |  |
| `attachment_required` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `leave_requests`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `type` | `text` |  |
| `start_date` | `date` |  |
| `end_date` | `date` |  |
| `reason` | `text` |  |
| `status` | `text` |  |
| `reviewed_by` | `text` |  Nullable |
| `reviewed_at` | `timestamptz` |  Nullable |
| `attachment_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `duration` | `text` |  |
| `hours` | `numeric` |  Nullable |

## Table `loan_balance_history`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `loan_id` | `text` |  |
| `date` | `date` |  |
| `previous_balance` | `numeric` |  |
| `deduction_amount` | `numeric` |  |
| `new_balance` | `numeric` |  |
| `payslip_id` | `text` |  Nullable |
| `notes` | `text` |  Nullable |

## Table `loan_deductions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `loan_id` | `text` |  |
| `payslip_id` | `text` |  |
| `amount` | `numeric` |  |
| `deducted_at` | `timestamptz` |  |
| `remaining_after` | `numeric` |  |

## Table `loan_repayment_schedule`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `loan_id` | `text` |  |
| `due_date` | `date` |  |
| `amount` | `numeric` |  |
| `paid` | `bool` |  |
| `payslip_id` | `text` |  Nullable |
| `skipped_reason` | `text` |  Nullable |

## Table `loans`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `type` | `text` |  |
| `amount` | `numeric` |  |
| `remaining_balance` | `numeric` |  |
| `monthly_deduction` | `numeric` |  |
| `deduction_cap_percent` | `numeric` |  |
| `status` | `text` |  |
| `approved_by` | `text` |  |
| `created_at` | `date` |  |
| `remarks` | `text` |  Nullable |
| `last_deducted_at` | `timestamptz` |  Nullable |

## Table `location_config`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `enabled` | `bool` |  |
| `ping_interval_minutes` | `int4` |  |
| `require_location` | `bool` |  |
| `warn_employee_out_of_fence` | `bool` |  |
| `alert_admin_out_of_fence` | `bool` |  |
| `alert_admin_location_disabled` | `bool` |  |
| `track_during_breaks` | `bool` |  |
| `retain_days` | `int4` |  |
| `require_selfie` | `bool` |  |
| `selfie_required_projects` | `_text` |  Nullable |
| `selfie_max_age` | `int4` |  |
| `show_reverse_geocode` | `bool` |  |
| `selfie_compression_quality` | `numeric` |  |
| `lunch_duration` | `int4` |  |
| `lunch_geofence_required` | `bool` |  |
| `lunch_overtime_threshold` | `int4` |  |
| `alert_admin_on_geofence_violation` | `bool` |  |
| `allowed_breaks_per_day` | `int4` |  |
| `break_grace_period` | `int4` |  |
| `updated_at` | `timestamptz` |  |

## Table `location_pings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `timestamp` | `timestamptz` |  |
| `lat` | `float8` |  |
| `lng` | `float8` |  |
| `accuracy_meters` | `float8` |  |
| `within_geofence` | `bool` |  |
| `project_id` | `text` |  Nullable |
| `distance_from_site` | `float8` |  Nullable |
| `source` | `text` |  |

## Table `manual_checkin_reasons`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `reason` | `text` |  |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `manual_checkins`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `event_type` | `text` |  |
| `reason_id` | `text` |  Nullable |
| `custom_reason` | `text` |  Nullable |
| `performed_by` | `text` |  |
| `timestamp_utc` | `timestamptz` |  |
| `project_id` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `nod_records`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `case_id` | `text` |  Unique |
| `employee_id` | `text` |  |
| `decision` | `text` |  |
| `sanction_start_date` | `date` |  Nullable |
| `sanction_end_date` | `date` |  Nullable |
| `return_to_work_date` | `date` |  Nullable |
| `decision_details` | `text` |  |
| `document_id` | `text` |  Nullable |
| `issued_by` | `text` |  |
| `issued_at` | `timestamptz` |  |
| `acknowledged_at` | `timestamptz` |  Nullable |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `notification_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `type` | `text` |  |
| `channel` | `text` |  |
| `subject` | `text` |  |
| `body` | `text` |  |
| `sent_at` | `timestamptz` |  |
| `status` | `text` |  |
| `recipient_email` | `text` |  Nullable |
| `recipient_phone` | `text` |  Nullable |
| `error_message` | `text` |  Nullable |
| `read` | `bool` |  |
| `read_at` | `timestamptz` |  Nullable |
| `link` | `text` |  Nullable |

## Table `notification_provider_config`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `sms_provider` | `text` |  |
| `email_provider` | `text` |  |
| `sms_enabled` | `bool` |  |
| `email_enabled` | `bool` |  |
| `default_sender_name` | `text` |  |
| `updated_at` | `timestamptz` |  |

## Table `notification_rules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `trigger` | `text` |  |
| `enabled` | `bool` |  |
| `channel` | `text` |  |
| `recipient_roles` | `_text` |  |
| `timing` | `text` |  |
| `schedule_time` | `text` |  Nullable |
| `reminder_days` | `_int4` |  Nullable |
| `subject_template` | `text` |  |
| `body_template` | `text` |  |
| `sms_template` | `text` |  Nullable |

## Table `nte_records`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `case_id` | `text` |  Unique |
| `employee_id` | `text` |  |
| `response_deadline` | `date` |  |
| `document_id` | `text` |  Nullable |
| `issued_by` | `text` |  |
| `issued_at` | `timestamptz` |  |
| `acknowledged_at` | `timestamptz` |  Nullable |
| `employee_explanation` | `text` |  Nullable |
| `explanation_submitted_at` | `timestamptz` |  Nullable |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `overtime_requests`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `date` | `date` |  |
| `hours_requested` | `numeric` |  |
| `reason` | `text` |  |
| `project_id` | `text` |  Nullable |
| `status` | `text` |  |
| `requested_at` | `timestamptz` |  |
| `reviewed_by` | `text` |  Nullable |
| `reviewed_at` | `timestamptz` |  Nullable |
| `rejection_reason` | `text` |  Nullable |

## Table `pay_schedule_config`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `default_frequency` | `text` |  |
| `semi_monthly_first_cutoff` | `int4` |  |
| `semi_monthly_first_pay_day` | `int4` |  |
| `semi_monthly_second_pay_day` | `int4` |  |
| `monthly_pay_day` | `int4` |  |
| `bi_weekly_start_date` | `date` |  Nullable |
| `weekly_pay_day` | `int4` |  |
| `deduct_gov_from` | `text` |  |
| `updated_at` | `timestamptz` |  |
| `auto_deduct_late` | `bool` |  |
| `auto_deduct_absent` | `bool` |  |
| `auto_deduct_undertime` | `bool` |  |
| `auto_add_overtime` | `bool` |  |
| `work_days_per_month` | `int4` |  |

## Table `payroll_adjustments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payroll_run_id` | `text` |  |
| `employee_id` | `text` |  |
| `adjustment_type` | `text` |  |
| `reference_payslip_id` | `text` |  |
| `amount` | `numeric` |  |
| `reason` | `text` |  |
| `created_by` | `text` |  |
| `created_at` | `timestamptz` |  |
| `approved_by` | `text` |  Nullable |
| `approved_at` | `timestamptz` |  Nullable |
| `applied_run_id` | `text` |  Nullable |
| `status` | `text` |  |

## Table `payroll_run_payslips`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `run_id` | `text` | Primary |
| `payslip_id` | `text` | Primary |
| `added_at` | `timestamptz` |  |

## Table `payroll_runs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `period_label` | `text` |  |
| `created_at` | `timestamptz` |  |
| `status` | `text` |  |
| `locked` | `bool` |  |
| `locked_at` | `timestamptz` |  Nullable |
| `published_at` | `timestamptz` |  Nullable |
| `paid_at` | `timestamptz` |  Nullable |
| `payslip_ids` | `_text` |  |
| `policy_snapshot` | `jsonb` |  Nullable |
| `run_type` | `text` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |
| `period_start` | `date` |  Nullable |
| `period_end` | `date` |  Nullable |

## Table `payroll_signature_config`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `mode` | `text` |  |
| `signatory_name` | `text` |  |
| `signatory_title` | `text` |  |
| `signature_data_url` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  |

## Table `payslip_line_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payslip_id` | `text` |  |
| `label` | `text` |  |
| `type` | `text` |  |
| `amount` | `numeric` |  |
| `template_id` | `text` |  Nullable |
| `calculation_detail` | `text` |  Nullable |

## Table `payslips`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `period_start` | `date` |  |
| `period_end` | `date` |  |
| `pay_frequency` | `text` |  Nullable |
| `gross_pay` | `numeric` |  |
| `allowances` | `numeric` |  |
| `sss_deduction` | `numeric` |  |
| `philhealth_deduction` | `numeric` |  |
| `pagibig_deduction` | `numeric` |  |
| `tax_deduction` | `numeric` |  |
| `other_deductions` | `numeric` |  |
| `loan_deduction` | `numeric` |  |
| `holiday_pay` | `numeric` |  Nullable |
| `net_pay` | `numeric` |  |
| `issued_at` | `date` |  |
| `status` | `text` |  |
| `confirmed_at` | `timestamptz` |  Nullable |
| `published_at` | `timestamptz` |  Nullable |
| `paid_at` | `timestamptz` |  Nullable |
| `payment_method` | `text` |  Nullable |
| `bank_reference_id` | `text` |  Nullable |
| `payroll_batch_id` | `text` |  Nullable |
| `pdf_hash` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `signed_at` | `timestamptz` |  Nullable |
| `signature_data_url` | `text` |  Nullable |
| `ack_text_version` | `text` |  Nullable |
| `adjustment_ref` | `text` |  Nullable |
| `acknowledged_at` | `timestamptz` |  Nullable |
| `acknowledged_by` | `text` |  Nullable |
| `paid_confirmed_by` | `text` |  Nullable |
| `paid_confirmed_at` | `timestamptz` |  Nullable |
| `custom_deductions` | `numeric` |  |
| `line_items_json` | `jsonb` |  Nullable |
| `payment_proof_url` | `text` |  Nullable |
| `cash_amount` | `numeric` |  Nullable |
| `late_deduction` | `numeric` |  |
| `absent_deduction` | `numeric` |  |
| `undertime_deduction` | `numeric` |  |
| `overtime_pay` | `numeric` |  |
| `daily_rate` | `numeric` |  |
| `hourly_rate` | `numeric` |  |
| `tax_categories` | `jsonb` |  Nullable |
| `taxable_compensation` | `numeric` |  |
| `non_taxable_compensation` | `numeric` |  |

## Table `penalty_records`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `reason` | `text` |  |
| `triggered_at` | `timestamptz` |  |
| `penalty_until` | `timestamptz` |  |
| `resolved` | `bool` |  |

## Table `previous_employer_records`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `year` | `int4` |  |
| `employer_name` | `text` |  |
| `employer_tin` | `text` |  Nullable |
| `employer_address` | `text` |  Nullable |
| `total_income` | `numeric` |  |
| `total_tax_withheld` | `numeric` |  |
| `reference_2316` | `text` |  Nullable |
| `submitted_at` | `timestamptz` |  |
| `submitted_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `email` | `text` |  Unique |
| `role` | `text` |  |
| `avatar_url` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `department` | `text` |  Nullable |
| `birthday` | `date` |  Nullable |
| `address` | `text` |  Nullable |
| `emergency_contact` | `text` |  Nullable |
| `must_change_password` | `bool` |  |
| `profile_complete` | `bool` |  |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `project_assignments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `project_id` | `text` | Primary |
| `employee_id` | `text` | Primary |
| `assigned_at` | `timestamptz` |  |

## Table `project_verification_methods`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `project_id` | `text` |  Unique |
| `verification_method` | `text` |  |
| `require_geofence` | `bool` |  Nullable |
| `geofence_radius_meters` | `int4` |  Nullable |
| `allow_manual_override` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `projects`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `location_lat` | `float8` |  Nullable |
| `location_lng` | `float8` |  Nullable |
| `location_radius` | `float8` |  Nullable |
| `assigned_employee_ids` | `_text` |  |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `verification_method` | `text` |  Nullable |
| `require_geofence` | `bool` |  Nullable |
| `geofence_radius_meters` | `int4` |  Nullable |
| `location_address` | `text` |  Nullable |
| `qr_secret` | `text` |  |
| `qr_enabled` | `bool` |  |

## Table `push_subscriptions`

Web Push API subscriptions for PWA push notifications

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `text` |  |
| `endpoint` | `text` |  Unique |
| `p256dh` | `text` |  |
| `auth` | `text` |  |
| `user_agent` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `last_used_at` | `timestamptz` |  Nullable |
| `is_active` | `bool` |  |

## Table `qr_tokens`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `device_id` | `text` |  |
| `token` | `text` |  Unique |
| `created_at` | `timestamptz` |  |
| `expires_at` | `timestamptz` |  |
| `used` | `bool` |  |
| `employee_id` | `text` |  Nullable |
| `used_at` | `timestamptz` |  Nullable |
| `used_by_kiosk_id` | `text` |  Nullable |

## Table `roles_custom`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `name` | `text` |  |
| `slug` | `text` |  Unique |
| `color` | `text` |  |
| `icon` | `text` |  |
| `is_system` | `bool` |  |
| `permissions` | `_text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `salary_change_requests`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `old_salary` | `numeric` |  |
| `proposed_salary` | `numeric` |  |
| `effective_date` | `date` |  |
| `reason` | `text` |  |
| `proposed_by` | `text` |  |
| `proposed_at` | `timestamptz` |  |
| `status` | `text` |  |
| `reviewed_by` | `text` |  Nullable |
| `reviewed_at` | `timestamptz` |  Nullable |

## Table `salary_history`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `monthly_salary` | `numeric` |  |
| `effective_from` | `date` |  |
| `effective_to` | `date` |  Nullable |
| `approved_by` | `text` |  |
| `reason` | `text` |  |

## Table `shift_templates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `name` | `text` |  |
| `start_time` | `text` |  |
| `end_time` | `text` |  |
| `grace_period` | `int4` |  |
| `break_duration` | `int4` |  |
| `work_days` | `_int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `site_survey_photos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `event_id` | `text` |  |
| `employee_id` | `text` |  |
| `photo_data_url` | `text` |  |
| `gps_lat` | `float8` |  |
| `gps_lng` | `float8` |  |
| `gps_accuracy_meters` | `float8` |  |
| `reverse_geo_address` | `text` |  Nullable |
| `captured_at` | `timestamptz` |  |
| `geofence_pass` | `bool` |  Nullable |
| `project_id` | `text` |  Nullable |

## Table `task_comments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `task_id` | `text` |  |
| `employee_id` | `text` |  |
| `message` | `text` |  |
| `attachment_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `task_completion_reports`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `task_id` | `text` |  |
| `employee_id` | `text` |  |
| `photo_data_url` | `text` |  Nullable |
| `gps_lat` | `float8` |  Nullable |
| `gps_lng` | `float8` |  Nullable |
| `gps_accuracy_meters` | `float8` |  Nullable |
| `reverse_geo_address` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `submitted_at` | `timestamptz` |  |
| `verified_by` | `text` |  Nullable |
| `verified_at` | `timestamptz` |  Nullable |
| `rejection_reason` | `text` |  Nullable |

## Table `task_groups`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `project_id` | `text` |  Nullable |
| `created_by` | `text` |  |
| `member_employee_ids` | `_text` |  |
| `announcement_permission` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `task_tags`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `name` | `text` |  Unique |
| `color` | `text` |  |
| `created_by` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `tasks`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `group_id` | `text` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  |
| `priority` | `text` |  |
| `status` | `text` |  |
| `due_date` | `date` |  Nullable |
| `assigned_to` | `_text` |  |
| `created_by` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `completion_required` | `bool` |  |
| `tags` | `_text` |  Nullable |
| `project_id` | `text` |  Nullable |
| `start_date` | `date` |  Nullable |

## Table `text_channels`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `name` | `text` |  |
| `group_id` | `text` |  Nullable |
| `member_employee_ids` | `_text` |  |
| `created_by` | `text` |  |
| `created_at` | `timestamptz` |  |
| `is_archived` | `bool` |  |

## Table `timesheets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `employee_id` | `text` |  |
| `date` | `date` |  |
| `rule_set_id` | `text` |  Nullable |
| `shift_id` | `text` |  Nullable |
| `regular_hours` | `numeric` |  |
| `overtime_hours` | `numeric` |  |
| `night_diff_hours` | `numeric` |  |
| `total_hours` | `numeric` |  |
| `late_minutes` | `int4` |  |
| `undertime_minutes` | `int4` |  |
| `segments` | `jsonb` |  |
| `status` | `text` |  |
| `computed_at` | `timestamptz` |  |
| `approved_by` | `text` |  Nullable |
| `approved_at` | `timestamptz` |  Nullable |

