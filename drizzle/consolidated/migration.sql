-- Consolidated baseline migration for enterprise SaaS target.
-- Strategy:
-- 1) Create core relational schema in deterministic order.
-- 2) Add constraints and indexes.
-- 3) Add tenant primitives and apply tenant-scoped index patterns.
-- 4) Keep idempotent with IF NOT EXISTS where possible.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tenancy primitives
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'donor',
  first_name text,
  last_name text,
  phone text,
  address text,
  profile_image text,
  is_active boolean NOT NULL DEFAULT true,
  email_verified boolean NOT NULL DEFAULT false,
  language text NOT NULL DEFAULT 'en',
  notifications text,
  notes text,
  tags jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS case_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text,
  color text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS category_detection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES case_categories(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS id_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  governorate text,
  country text DEFAULT 'Egypt',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  mobile_number text,
  additional_mobile_number text,
  email text,
  national_id text,
  city text,
  governorate text,
  country text DEFAULT 'Egypt',
  notes text,
  risk_level text DEFAULT 'low',
  id_type_id uuid REFERENCES id_types(id),
  city_id uuid REFERENCES cities(id),
  created_by uuid REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS beneficiary_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  beneficiary_id uuid NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  is_public boolean DEFAULT false,
  description text,
  uploaded_at timestamp DEFAULT now(),
  uploaded_by uuid REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title_en text NOT NULL,
  title_ar text,
  description_ar text NOT NULL,
  description_en text,
  type text NOT NULL DEFAULT 'one-time',
  category_id uuid REFERENCES case_categories(id),
  priority text NOT NULL,
  location text,
  beneficiary_name text,
  beneficiary_contact text,
  target_amount numeric(10,2) NOT NULL,
  current_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  beneficiary_id uuid REFERENCES beneficiaries(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  assigned_to uuid REFERENCES users(id),
  sponsored_by uuid REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  update_type text NOT NULL DEFAULT 'general',
  is_public boolean NOT NULL DEFAULT true,
  attachments text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES users(id),
  system_triggered boolean NOT NULL DEFAULT false,
  change_reason text,
  changed_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  filename text NOT NULL,
  original_filename text,
  file_url text NOT NULL,
  file_path text,
  file_type text NOT NULL,
  file_size integer DEFAULT 0,
  category text DEFAULT 'other',
  is_public boolean DEFAULT false,
  is_primary boolean DEFAULT false,
  uploaded_by uuid REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  target_amount numeric(10,2) NOT NULL,
  current_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  cycle_duration text NOT NULL,
  cycle_duration_days integer,
  total_cycles integer,
  current_cycle_number integer NOT NULL DEFAULT 1,
  next_cycle_date timestamp,
  last_cycle_date timestamp,
  auto_progress boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES users(id),
  assigned_to uuid REFERENCES users(id),
  supporting_documents text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cycle_number integer NOT NULL,
  start_date timestamp NOT NULL,
  end_date timestamp NOT NULL,
  target_amount numeric(10,2) NOT NULL,
  current_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  progress_percentage numeric(5,2) NOT NULL DEFAULT 0,
  notes text,
  completed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  anonymous boolean NOT NULL DEFAULT false,
  donor_id uuid NOT NULL REFERENCES users(id),
  case_id uuid REFERENCES cases(id),
  notes text,
  original_contribution_id uuid REFERENCES contributions(id),
  revision_number integer,
  revision_explanation text,
  message text,
  proof_url text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recurring_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  donor_id uuid NOT NULL REFERENCES users(id),
  case_id uuid REFERENCES cases(id),
  project_id uuid REFERENCES projects(id),
  amount numeric(10,2) NOT NULL,
  frequency text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  start_date timestamp NOT NULL,
  end_date timestamp,
  next_contribution_date timestamp NOT NULL,
  total_contributions integer NOT NULL DEFAULT 0,
  successful_contributions integer NOT NULL DEFAULT 0,
  failed_contributions integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL,
  auto_process boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sponsorships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sponsor_id uuid NOT NULL REFERENCES users(id),
  case_id uuid REFERENCES cases(id),
  project_id uuid REFERENCES projects(id),
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  terms text,
  start_date timestamp NOT NULL,
  end_date timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contribution_approval_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contribution_id uuid NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  admin_id uuid REFERENCES users(id),
  rejection_reason text,
  admin_comment text,
  donor_reply text,
  donor_reply_date timestamp,
  payment_proof_url text,
  resubmission_count integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id),
  recipient_id uuid NOT NULL REFERENCES users(id),
  subject text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type text NOT NULL,
  recipient_id uuid NOT NULL REFERENCES users(id),
  title_en text,
  title_ar text,
  message_en text,
  message_ar text,
  data jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, token)
);

CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_name text NOT NULL,
  level integer NOT NULL DEFAULT 0,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_name text NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS admin_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES users(id),
  assigned_at timestamp DEFAULT now(),
  expires_at timestamp,
  is_active boolean DEFAULT true,
  UNIQUE (tenant_id, user_id, role_id)
);

CREATE TABLE IF NOT EXISTS admin_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES admin_menu_items(id) ON DELETE CASCADE,
  label text NOT NULL,
  label_ar text,
  href text NOT NULL,
  icon text,
  description text,
  description_ar text,
  sort_order integer DEFAULT 0,
  permission_id uuid REFERENCES admin_permissions(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batch_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  source_file text,
  status text NOT NULL DEFAULT 'pending',
  total_items integer NOT NULL DEFAULT 0,
  processed_items integer NOT NULL DEFAULT 0,
  successful_items integer NOT NULL DEFAULT 0,
  failed_items integer NOT NULL DEFAULT 0,
  error_summary jsonb,
  metadata jsonb,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  completed_at timestamp
);

CREATE TABLE IF NOT EXISTS batch_upload_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES batch_uploads(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  case_number text NOT NULL,
  case_title text NOT NULL,
  contributor_nickname text NOT NULL,
  amount numeric(10,2) NOT NULL,
  month text NOT NULL,
  user_id uuid REFERENCES users(id),
  case_id uuid REFERENCES cases(id),
  contribution_id uuid REFERENCES contributions(id),
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  mapping_notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nickname_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nickname)
);

CREATE TABLE IF NOT EXISTS site_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  session_id text,
  activity_type text NOT NULL,
  category text,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  resource_path text,
  method text,
  status_code integer,
  ip_address text,
  user_agent text,
  referer text,
  details jsonb,
  metadata jsonb,
  severity text DEFAULT 'info',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_merge_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  source_user_id uuid NOT NULL REFERENCES users(id),
  target_user_id uuid NOT NULL REFERENCES users(id),
  backup_payload jsonb NOT NULL,
  rollback_token text NOT NULL UNIQUE,
  created_by uuid REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS localization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value text NOT NULL,
  language text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS landing_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_key text NOT NULL UNIQUE,
  stat_value numeric(20,0) NOT NULL DEFAULT 0,
  display_format text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS landing_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_value text NOT NULL,
  description text,
  description_ar text,
  group_type text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key text NOT NULL UNIQUE,
  title_en text NOT NULL,
  title_ar text NOT NULL,
  content_en text NOT NULL,
  content_ar text NOT NULL,
  description text,
  description_ar text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_name text NOT NULL UNIQUE,
  max_file_size_mb integer NOT NULL DEFAULT 5,
  allowed_extensions text[] NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  prompt_template text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_rule_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES ai_rules(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text,
  value_type text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (rule_id, key)
);

CREATE TABLE IF NOT EXISTS visitor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  session_key text NOT NULL UNIQUE,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  referer text
);

-- Reporting views
CREATE OR REPLACE VIEW category_summary_view AS
SELECT c.tenant_id, c.category_id, COUNT(*)::bigint AS cases_count
FROM cases c
GROUP BY c.tenant_id, c.category_id;

CREATE OR REPLACE VIEW contribution_latest_status AS
SELECT DISTINCT ON (contribution_id)
  contribution_id, status, updated_at
FROM contribution_approval_status
ORDER BY contribution_id, updated_at DESC;

CREATE OR REPLACE VIEW monthly_breakdown_view AS
SELECT
  tenant_id,
  date_trunc('month', created_at) AS month,
  COUNT(*)::bigint AS contributions_count,
  COALESCE(SUM(amount), 0)::numeric(14,2) AS total_amount
FROM contributions
GROUP BY tenant_id, date_trunc('month', created_at);

CREATE OR REPLACE VIEW site_activity_summary AS
SELECT
  tenant_id,
  date_trunc('day', created_at) AS day,
  COUNT(*)::bigint AS events_count
FROM site_activity_log
GROUP BY tenant_id, date_trunc('day', created_at);

CREATE OR REPLACE VIEW visitor_activity_summary AS
SELECT
  tenant_id,
  date_trunc('day', first_seen_at) AS day,
  COUNT(*)::bigint AS sessions_count
FROM visitor_sessions
GROUP BY tenant_id, date_trunc('day', first_seen_at);

-- Critical indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cases_tenant_status ON cases(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cases_tenant_category ON cases(tenant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_contributions_tenant_status ON contributions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_contributions_tenant_case ON contributions(tenant_id, case_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_recipient ON notifications(tenant_id, recipient_id, read);
CREATE INDEX IF NOT EXISTS idx_site_activity_tenant_created ON site_activity_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_tenant_user ON admin_user_roles(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_case_updates_tenant_case ON case_updates(tenant_id, case_id);
CREATE INDEX IF NOT EXISTS idx_case_status_history_tenant_case ON case_status_history(tenant_id, case_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_status ON projects(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_project_cycles_tenant_project ON project_cycles(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_tenant_status ON sponsorships(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_recurring_contributions_tenant_status ON recurring_contributions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_tenant_user ON push_subscriptions(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_tenant_user ON fcm_tokens(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_batch_uploads_tenant_status ON batch_uploads(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_batch_upload_items_tenant_batch ON batch_upload_items(tenant_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_merge_backups_created ON user_merge_backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_rules_active ON ai_rules(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_tenant_last_seen ON visitor_sessions(tenant_id, last_seen_at DESC);

COMMIT;
