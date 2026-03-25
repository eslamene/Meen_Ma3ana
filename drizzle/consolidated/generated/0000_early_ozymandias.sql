-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "case_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text,
	"file_url" text NOT NULL,
	"file_path" text,
	"file_type" text NOT NULL,
	"file_size" bigint DEFAULT 0,
	"category" text DEFAULT 'other',
	"description" text,
	"is_public" boolean DEFAULT false,
	"is_primary" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "admin_user_roles_user_id_role_id_key" UNIQUE("user_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "admin_user_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "admin_menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"label" varchar(100) NOT NULL,
	"label_ar" varchar(100),
	"href" varchar(255) NOT NULL,
	"icon" varchar(50),
	"description" text,
	"description_ar" text,
	"sort_order" integer DEFAULT 0,
	"permission_id" uuid,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"is_public_nav" boolean DEFAULT false,
	"nav_metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "admin_menu_items_href_parent_id_key" UNIQUE("parent_id","href")
);
--> statement-breakpoint
ALTER TABLE "admin_menu_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "admin_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"display_name_ar" varchar(100),
	"description" text,
	"description_ar" text,
	"level" integer DEFAULT 0 NOT NULL,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "admin_roles_name_key" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "admin_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "admin_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"display_name_ar" varchar(200),
	"description" text,
	"description_ar" text,
	"resource" varchar(50) NOT NULL,
	"action" varchar(50) NOT NULL,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "admin_permissions_name_key" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "admin_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "admin_role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "admin_role_permissions_role_id_permission_id_key" UNIQUE("role_id","permission_id")
);
--> statement-breakpoint
ALTER TABLE "admin_role_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "landing_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stat_key" text NOT NULL,
	"stat_value" bigint DEFAULT 0 NOT NULL,
	"display_format" text,
	"updated_at" timestamp with time zone DEFAULT now(),
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "landing_stats_stat_key_key" UNIQUE("stat_key")
);
--> statement-breakpoint
ALTER TABLE "landing_stats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" varchar(50) NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" uuid NOT NULL,
	"user_id" uuid,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "beneficiaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_ar" text,
	"age" integer,
	"gender" text,
	"mobile_number" text,
	"email" text,
	"alternative_contact" text,
	"national_id" text,
	"id_type" text DEFAULT 'national_id',
	"address" text,
	"city" text,
	"governorate" text,
	"country" text DEFAULT 'Egypt',
	"medical_condition" text,
	"social_situation" text,
	"family_size" integer,
	"dependents" integer,
	"is_verified" boolean DEFAULT false,
	"verification_date" timestamp with time zone,
	"verification_notes" text,
	"notes" text,
	"tags" text[],
	"risk_level" text DEFAULT 'low',
	"total_cases" integer DEFAULT 0,
	"active_cases" integer DEFAULT 0,
	"total_amount_received" numeric(15, 2) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_by" uuid,
	"year_of_birth" integer,
	"additional_mobile_number" varchar(20),
	"id_type_id" uuid,
	"city_id" uuid,
	CONSTRAINT "unique_mobile_natid" UNIQUE("mobile_number","national_id"),
	CONSTRAINT "at_least_one_identifier" CHECK ((mobile_number IS NOT NULL) OR (national_id IS NOT NULL)),
	CONSTRAINT "beneficiaries_gender_check" CHECK (gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text])),
	CONSTRAINT "beneficiaries_id_type_check" CHECK (id_type = ANY (ARRAY['national_id'::text, 'passport'::text, 'other'::text])),
	CONSTRAINT "beneficiaries_risk_level_check" CHECK (risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))
);
--> statement-breakpoint
ALTER TABLE "beneficiaries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "system_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_key" text NOT NULL,
	"config_value" text NOT NULL,
	"description" text,
	"description_ar" text,
	"updated_at" timestamp with time zone DEFAULT now(),
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"group_type" text,
	CONSTRAINT "system_config_config_key_key" UNIQUE("config_key")
);
--> statement-breakpoint
ALTER TABLE "system_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "localization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"language" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landing_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "message_length" CHECK ((char_length(message) >= 10) AND (char_length(message) <= 5000)),
	CONSTRAINT "valid_email_format" CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)
);
--> statement-breakpoint
ALTER TABLE "landing_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "case_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"previous_status" text,
	"new_status" text NOT NULL,
	"changed_by" uuid,
	"system_triggered" boolean DEFAULT false NOT NULL,
	"change_reason" text,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"color" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"description_en" text,
	"description_ar" text
);
--> statement-breakpoint
ALTER TABLE "case_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"target_amount" numeric(10, 2) NOT NULL,
	"current_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"cycle_duration" text NOT NULL,
	"cycle_duration_days" integer,
	"total_cycles" integer,
	"current_cycle_number" integer DEFAULT 1 NOT NULL,
	"next_cycle_date" timestamp,
	"last_cycle_date" timestamp,
	"auto_progress" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"assigned_to" uuid,
	"supporting_documents" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"cycle_number" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"target_amount" numeric(10, 2) NOT NULL,
	"current_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"progress_percentage" numeric(5, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsorships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sponsor_id" uuid NOT NULL,
	"case_id" uuid,
	"project_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"terms" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"recipient_id" uuid NOT NULL,
	"title" text,
	"message" text,
	"data" jsonb,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"title_en" text,
	"title_ar" text,
	"message_en" text,
	"message_ar" text
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recurring_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donor_id" uuid NOT NULL,
	"case_id" uuid,
	"project_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"frequency" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"next_contribution_date" timestamp NOT NULL,
	"total_contributions" integer DEFAULT 0 NOT NULL,
	"successful_contributions" integer DEFAULT 0 NOT NULL,
	"failed_contributions" integer DEFAULT 0 NOT NULL,
	"payment_method" text NOT NULL,
	"auto_process" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name_en" text,
	"name_ar" text,
	"description_en" text,
	"description_ar" text,
	"icon" text,
	CONSTRAINT "payment_methods_code_key" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "payment_methods" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "case_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"update_type" text DEFAULT 'general' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"attachments" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_updates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_en" text NOT NULL,
	"description_ar" text NOT NULL,
	"type" text DEFAULT 'one-time' NOT NULL,
	"category_id" uuid,
	"priority" text NOT NULL,
	"location" text,
	"beneficiary_name" text,
	"beneficiary_contact" text,
	"target_amount" numeric(10, 2) NOT NULL,
	"current_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"frequency" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"duration" integer,
	"created_by" uuid NOT NULL,
	"assigned_to" uuid,
	"sponsored_by" uuid,
	"supporting_documents" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"beneficiary_id" uuid,
	"title_ar" text,
	"description_en" text,
	"batch_id" uuid
);
--> statement-breakpoint
ALTER TABLE "cases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"proof_of_payment" text,
	"donor_id" uuid NOT NULL,
	"case_id" uuid,
	"project_id" uuid,
	"project_cycle_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"anonymous" boolean DEFAULT false NOT NULL,
	"payment_method_id" uuid NOT NULL,
	"payment_method_backup" text,
	"batch_id" uuid
);
--> statement-breakpoint
ALTER TABLE "contributions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'donor' NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"address" text,
	"profile_image" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"notifications" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contribution_approval_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contribution_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_id" uuid,
	"rejection_reason" text,
	"admin_comment" text,
	"donor_reply" text,
	"donor_reply_date" timestamp,
	"payment_proof_url" text,
	"resubmission_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "contribution_approval_status" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "category_detection_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"keyword" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"category_id" uuid NOT NULL,
	CONSTRAINT "category_detection_rules_category_id_keyword_unique" UNIQUE("keyword","category_id")
);
--> statement-breakpoint
ALTER TABLE "category_detection_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "beneficiary_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"is_public" boolean DEFAULT false,
	"description" text,
	"uploaded_at" timestamp with time zone DEFAULT now(),
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "beneficiary_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "id_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"name_ar" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "id_types_code_key" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "id_types" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"name_ar" varchar(100) NOT NULL,
	"governorate" varchar(100),
	"country" varchar(100) DEFAULT 'Egypt',
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cities_code_key" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "cities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "site_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_id" varchar(255),
	"activity_type" varchar(50) NOT NULL,
	"category" varchar(50),
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(100),
	"resource_id" uuid,
	"resource_path" varchar(500),
	"method" varchar(10),
	"status_code" integer,
	"ip_address" "inet",
	"user_agent" text,
	"referer" varchar(500),
	"details" jsonb,
	"metadata" jsonb,
	"severity" varchar(20) DEFAULT 'info',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "site_activity_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "storage_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket_name" text NOT NULL,
	"max_file_size_mb" integer DEFAULT 5 NOT NULL,
	"allowed_extensions" text[] DEFAULT '{"RAY['pdf'::text","'jpg'::text","'jpeg'::text","'png'::text","'gif'::text","'webp'::tex"}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storage_rules_bucket_name_key" UNIQUE("bucket_name")
);
--> statement-breakpoint
ALTER TABLE "storage_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "system_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_key" text NOT NULL,
	"title_en" text NOT NULL,
	"title_ar" text NOT NULL,
	"content_en" text NOT NULL,
	"content_ar" text NOT NULL,
	"description" text,
	"description_ar" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now(),
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "system_content_content_key_key" UNIQUE("content_key")
);
--> statement-breakpoint
ALTER TABLE "system_content" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_merge_backups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merge_id" uuid NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"delete_source" boolean DEFAULT false NOT NULL,
	"backup_data" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"rolled_back_at" timestamp with time zone,
	"total_records_backed_up" integer DEFAULT 0,
	"total_records_migrated" integer DEFAULT 0,
	"errors" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"notes" text,
	CONSTRAINT "user_merge_backups_merge_id_key" UNIQUE("merge_id")
);
--> statement-breakpoint
ALTER TABLE "user_merge_backups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_user_id_endpoint_key" UNIQUE("user_id","endpoint")
);
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fcm_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fcm_token" text NOT NULL,
	"device_id" text,
	"platform" text,
	"user_agent" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fcm_tokens_user_id_fcm_token_key" UNIQUE("user_id","fcm_token")
);
--> statement-breakpoint
ALTER TABLE "fcm_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_key" text NOT NULL,
	"instruction" text NOT NULL,
	"scope" text DEFAULT 'global' NOT NULL,
	"scope_reference" text,
	"priority" integer DEFAULT 100 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"lang" text,
	"group_id" uuid,
	CONSTRAINT "ai_rules_rule_key_key" UNIQUE("rule_key"),
	CONSTRAINT "ai_rules_priority_check" CHECK ((priority >= 1) AND (priority <= 1000)),
	CONSTRAINT "ai_rules_scope_check" CHECK (scope = ANY (ARRAY['global'::text, 'module'::text, 'feature'::text, 'tenant'::text, 'user'::text, 'role'::text, 'case'::text]))
);
--> statement-breakpoint
ALTER TABLE "ai_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "batch_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"source_file" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"processed_items" integer DEFAULT 0 NOT NULL,
	"successful_items" integer DEFAULT 0 NOT NULL,
	"failed_items" integer DEFAULT 0 NOT NULL,
	"error_summary" jsonb,
	"metadata" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_rule_parameters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_key" text NOT NULL,
	"parameter_key" text NOT NULL,
	"parameter_value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_rule_parameters_rule_key_parameter_key_key" UNIQUE("rule_key","parameter_key")
);
--> statement-breakpoint
ALTER TABLE "ai_rule_parameters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "batch_upload_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"case_number" text NOT NULL,
	"case_title" text NOT NULL,
	"contributor_nickname" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"month" text NOT NULL,
	"user_id" uuid,
	"case_id" uuid,
	"contribution_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"mapping_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nickname_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nickname" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nickname_mappings_nickname_key" UNIQUE("nickname")
);
--> statement-breakpoint
ALTER TABLE "case_files" ADD CONSTRAINT "case_files_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_files" ADD CONSTRAINT "case_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_menu_items" ADD CONSTRAINT "admin_menu_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."admin_menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_menu_items" ADD CONSTRAINT "admin_menu_items_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."admin_permissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."admin_permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_stats" ADD CONSTRAINT "landing_stats_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_id_type_id_fkey" FOREIGN KEY ("id_type_id") REFERENCES "public"."id_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_config" ADD CONSTRAINT "system_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_cycles" ADD CONSTRAINT "project_cycles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_sponsor_id_users_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_contributions" ADD CONSTRAINT "recurring_contributions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_contributions" ADD CONSTRAINT "recurring_contributions_donor_id_users_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_contributions" ADD CONSTRAINT "recurring_contributions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_updates" ADD CONSTRAINT "case_updates_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_updates" ADD CONSTRAINT "case_updates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batch_uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."beneficiaries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_category_id_case_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."case_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_sponsored_by_users_id_fk" FOREIGN KEY ("sponsored_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batch_uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_project_cycle_id_fkey" FOREIGN KEY ("project_cycle_id") REFERENCES "public"."project_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_approval_status" ADD CONSTRAINT "contribution_approval_status_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_approval_status" ADD CONSTRAINT "contribution_approval_status_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "public"."contributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_detection_rules" ADD CONSTRAINT "category_detection_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."case_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_detection_rules" ADD CONSTRAINT "category_detection_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_detection_rules" ADD CONSTRAINT "category_detection_rules_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary_documents" ADD CONSTRAINT "beneficiary_documents_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."beneficiaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary_documents" ADD CONSTRAINT "beneficiary_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_activity_log" ADD CONSTRAINT "site_activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_content" ADD CONSTRAINT "system_content_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_merge_backups" ADD CONSTRAINT "user_merge_backups_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_merge_backups" ADD CONSTRAINT "user_merge_backups_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_merge_backups" ADD CONSTRAINT "user_merge_backups_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fcm_tokens" ADD CONSTRAINT "fcm_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_rules" ADD CONSTRAINT "ai_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_rules" ADD CONSTRAINT "ai_rules_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_uploads" ADD CONSTRAINT "batch_uploads_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_rule_parameters" ADD CONSTRAINT "ai_rule_parameters_rule_key_fkey" FOREIGN KEY ("rule_key") REFERENCES "public"."ai_rules"("rule_key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_upload_items" ADD CONSTRAINT "batch_upload_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batch_uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_upload_items" ADD CONSTRAINT "batch_upload_items_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_upload_items" ADD CONSTRAINT "batch_upload_items_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "public"."contributions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_upload_items" ADD CONSTRAINT "batch_upload_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nickname_mappings" ADD CONSTRAINT "nickname_mappings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nickname_mappings" ADD CONSTRAINT "nickname_mappings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_case_files_case_id" ON "case_files" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_case_files_category" ON "case_files" USING btree ("category" text_ops);--> statement-breakpoint
CREATE INDEX "idx_case_files_display_order" ON "case_files" USING btree ("case_id" uuid_ops,"display_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_case_files_file_type" ON "case_files" USING btree ("file_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_case_files_filename" ON "case_files" USING btree ("filename" text_ops);--> statement-breakpoint
CREATE INDEX "idx_case_files_is_primary" ON "case_files" USING btree ("case_id" bool_ops,"is_primary" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_admin_user_roles_active" ON "admin_user_roles" USING btree ("user_id" bool_ops,"is_active" uuid_ops) WHERE (is_active = true);--> statement-breakpoint
CREATE INDEX "idx_admin_user_roles_role_id" ON "admin_user_roles" USING btree ("role_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_admin_user_roles_user_id" ON "admin_user_roles" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_admin_menu_items_parent_id" ON "admin_menu_items" USING btree ("parent_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_admin_menu_items_public_nav" ON "admin_menu_items" USING btree ("is_public_nav" bool_ops,"sort_order" int4_ops) WHERE ((is_public_nav = true) AND (is_active = true));--> statement-breakpoint
CREATE INDEX "idx_admin_menu_items_sort_order" ON "admin_menu_items" USING btree ("sort_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_admin_permissions_resource_action" ON "admin_permissions" USING btree ("resource" text_ops,"action" text_ops);--> statement-breakpoint
CREATE INDEX "idx_admin_role_permissions_permission_id" ON "admin_role_permissions" USING btree ("permission_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_admin_role_permissions_role_id" ON "admin_role_permissions" USING btree ("role_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_landing_stats_key" ON "landing_stats" USING btree ("stat_key" text_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_logs_table_name" ON "audit_logs" USING btree ("table_name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_city" ON "beneficiaries" USING btree ("city" text_ops);--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_created_at" ON "beneficiaries" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_is_verified" ON "beneficiaries" USING btree ("is_verified" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_mobile" ON "beneficiaries" USING btree ("mobile_number" text_ops) WHERE (mobile_number IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_name" ON "beneficiaries" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_name_search" ON "beneficiaries" USING gin (to_tsvector('english'::regconfig, name) tsvector_ops);--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_national_id" ON "beneficiaries" USING btree ("national_id" text_ops) WHERE (national_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_tags" ON "beneficiaries" USING gin ("tags" array_ops);--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_year_of_birth" ON "beneficiaries" USING btree ("year_of_birth" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_system_config_group_type" ON "system_config" USING btree ("group_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_system_config_key" ON "system_config" USING btree ("config_key" text_ops);--> statement-breakpoint
CREATE INDEX "idx_landing_contacts_created_at" ON "landing_contacts" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_landing_contacts_email" ON "landing_contacts" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_notifications_created_at" ON "notifications" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_notifications_recipient_created" ON "notifications" USING btree ("recipient_id" timestamp_ops,"created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_payment_methods_code" ON "payment_methods" USING btree ("code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_payment_methods_is_active" ON "payment_methods" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "cases_batch_id_idx" ON "cases" USING btree ("batch_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_cases_beneficiary_id" ON "cases" USING btree ("beneficiary_id" uuid_ops) WHERE (beneficiary_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "contributions_batch_id_idx" ON "contributions" USING btree ("batch_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_contributions_admin_queries" ON "contributions" USING btree ("created_at" timestamp_ops,"donor_id" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_contributions_case_id" ON "contributions" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_contributions_donor_id" ON "contributions" USING btree ("donor_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_unique" ON "users" USING btree ("phone" text_ops) WHERE ((phone IS NOT NULL) AND (phone <> ''::text) AND (TRIM(BOTH FROM phone) <> ''::text));--> statement-breakpoint
CREATE INDEX "idx_contribution_latest_status_approval" ON "contribution_approval_status" USING btree ("contribution_id" text_ops,"status" text_ops,"created_at" text_ops);--> statement-breakpoint
CREATE INDEX "idx_category_detection_rules_active" ON "category_detection_rules" USING btree ("is_active" bool_ops) WHERE (is_active = true);--> statement-breakpoint
CREATE INDEX "idx_category_detection_rules_category_id" ON "category_detection_rules" USING btree ("category_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_category_detection_rules_keyword" ON "category_detection_rules" USING btree ("keyword" text_ops);--> statement-breakpoint
CREATE INDEX "idx_beneficiary_documents_beneficiary_id" ON "beneficiary_documents" USING btree ("beneficiary_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_beneficiary_documents_public" ON "beneficiary_documents" USING btree ("is_public" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_beneficiary_documents_type" ON "beneficiary_documents" USING btree ("document_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_site_activity_action" ON "site_activity_log" USING btree ("action" text_ops);--> statement-breakpoint
CREATE INDEX "idx_site_activity_category" ON "site_activity_log" USING btree ("category" text_ops);--> statement-breakpoint
CREATE INDEX "idx_site_activity_created_at" ON "site_activity_log" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_site_activity_resource_created" ON "site_activity_log" USING btree ("resource_type" uuid_ops,"resource_id" text_ops,"created_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_site_activity_resource_id" ON "site_activity_log" USING btree ("resource_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_site_activity_resource_path" ON "site_activity_log" USING btree ("resource_path" text_ops);--> statement-breakpoint
CREATE INDEX "idx_site_activity_resource_type" ON "site_activity_log" USING btree ("resource_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_site_activity_session_id" ON "site_activity_log" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_site_activity_severity" ON "site_activity_log" USING btree ("severity" text_ops);--> statement-breakpoint
CREATE INDEX "idx_site_activity_type" ON "site_activity_log" USING btree ("activity_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_site_activity_type_created" ON "site_activity_log" USING btree ("activity_type" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_site_activity_user_created" ON "site_activity_log" USING btree ("user_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_site_activity_user_id" ON "site_activity_log" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_site_activity_user_id_merge" ON "site_activity_log" USING btree ("user_id" uuid_ops) WHERE (user_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_storage_rules_bucket_name" ON "storage_rules" USING btree ("bucket_name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_system_content_active" ON "system_content" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_system_content_key" ON "system_content" USING btree ("content_key" text_ops);--> statement-breakpoint
CREATE INDEX "idx_user_merge_backups_created_at" ON "user_merge_backups" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_user_merge_backups_from_user" ON "user_merge_backups" USING btree ("from_user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_user_merge_backups_merge_id" ON "user_merge_backups" USING btree ("merge_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_user_merge_backups_status" ON "user_merge_backups" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_user_merge_backups_to_user" ON "user_merge_backups" USING btree ("to_user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_push_subscriptions_endpoint" ON "push_subscriptions" USING btree ("endpoint" text_ops);--> statement-breakpoint
CREATE INDEX "idx_push_subscriptions_user_id" ON "push_subscriptions" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_fcm_tokens_active" ON "fcm_tokens" USING btree ("active" bool_ops) WHERE (active = true);--> statement-breakpoint
CREATE INDEX "idx_fcm_tokens_token" ON "fcm_tokens" USING btree ("fcm_token" text_ops);--> statement-breakpoint
CREATE INDEX "idx_fcm_tokens_user_id" ON "fcm_tokens" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_rules_active" ON "ai_rules" USING btree ("is_active" bool_ops) WHERE (is_active = true);--> statement-breakpoint
CREATE INDEX "idx_ai_rules_group_id" ON "ai_rules" USING btree ("group_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_rules_lang" ON "ai_rules" USING btree ("lang" text_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_rules_priority" ON "ai_rules" USING btree ("priority" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_rules_rule_key" ON "ai_rules" USING btree ("rule_key" text_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_rules_scope" ON "ai_rules" USING btree ("scope" text_ops,"scope_reference" text_ops);--> statement-breakpoint
CREATE INDEX "batch_uploads_created_at_idx" ON "batch_uploads" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "batch_uploads_created_by_idx" ON "batch_uploads" USING btree ("created_by" uuid_ops);--> statement-breakpoint
CREATE INDEX "batch_uploads_status_idx" ON "batch_uploads" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_rule_parameters_rule_key" ON "ai_rule_parameters" USING btree ("rule_key" text_ops);--> statement-breakpoint
CREATE INDEX "batch_upload_items_batch_id_idx" ON "batch_upload_items" USING btree ("batch_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "batch_upload_items_case_id_idx" ON "batch_upload_items" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "batch_upload_items_case_number_idx" ON "batch_upload_items" USING btree ("case_number" text_ops);--> statement-breakpoint
CREATE INDEX "batch_upload_items_status_idx" ON "batch_upload_items" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "batch_upload_items_user_id_idx" ON "batch_upload_items" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "nickname_mappings_nickname_idx" ON "nickname_mappings" USING btree ("nickname" text_ops);--> statement-breakpoint
CREATE INDEX "nickname_mappings_user_id_idx" ON "nickname_mappings" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE VIEW "public"."contribution_latest_status" AS (SELECT DISTINCT ON (c.id) c.id AS contribution_id, c.donor_id, c.case_id, c.amount, c.status AS contribution_status, c.created_at, c.updated_at, COALESCE(cas.status, 'pending'::text) AS approval_status, cas.rejection_reason, cas.admin_comment, cas.updated_at AS status_updated_at FROM contributions c LEFT JOIN contribution_approval_status cas ON c.id = cas.contribution_id ORDER BY c.id, cas.created_at DESC NULLS LAST);--> statement-breakpoint
CREATE VIEW "public"."category_summary_view" AS (SELECT cc.id AS category_id, COALESCE(cc.name_en, cc.name) AS name_en, COALESCE(cc.name_ar, cc.name) AS name_ar, COALESCE(cc.description_en, cc.description) AS description_en, COALESCE(cc.description_ar, cc.description) AS description_ar, cc.icon, cc.color, count(DISTINCT c.id) AS total_cases, COALESCE(sum(c.current_amount::numeric), 0::numeric) AS total_amount, CASE WHEN count(DISTINCT c.id) > 0 THEN COALESCE(sum(c.current_amount::numeric), 0::numeric) / count(DISTINCT c.id)::numeric ELSE 0::numeric END AS average_per_case FROM case_categories cc LEFT JOIN cases c ON c.category_id = cc.id AND c.status = 'published'::text WHERE cc.is_active = true GROUP BY cc.id, cc.name_en, cc.name_ar, cc.name, cc.description_en, cc.description_ar, cc.description, cc.icon, cc.color ORDER BY (COALESCE(sum(c.current_amount::numeric), 0::numeric)) DESC);--> statement-breakpoint
CREATE VIEW "public"."site_activity_summary" AS (SELECT date_trunc('day'::text, created_at) AS date, activity_type, category, action, count(*) AS count, count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS unique_users, count(DISTINCT session_id) AS unique_sessions, count(DISTINCT session_id) FILTER (WHERE user_id IS NULL) AS unique_visitor_sessions, count(*) FILTER (WHERE user_id IS NULL) AS visitor_activities, count(*) FILTER (WHERE user_id IS NOT NULL) AS authenticated_activities FROM site_activity_log GROUP BY (date_trunc('day'::text, created_at)), activity_type, category, action);--> statement-breakpoint
CREATE VIEW "public"."visitor_activity_summary" AS (SELECT date_trunc('day'::text, created_at) AS date, activity_type, category, action, count(*) AS count, count(DISTINCT session_id) AS unique_visitor_sessions, count(DISTINCT ip_address) AS unique_visitor_ips, count(DISTINCT resource_path) AS unique_pages_viewed FROM site_activity_log WHERE user_id IS NULL GROUP BY (date_trunc('day'::text, created_at)), activity_type, category, action);--> statement-breakpoint
CREATE VIEW "public"."visitor_sessions" AS (SELECT session_id, min(created_at) AS session_start, max(created_at) AS session_end, count(*) AS page_views, count(DISTINCT resource_path) AS unique_pages, array_agg(DISTINCT resource_path ORDER BY resource_path) AS pages_visited, max(ip_address) AS ip_address, max(user_agent) AS user_agent, EXTRACT(epoch FROM max(created_at) - min(created_at)) AS session_duration_seconds FROM site_activity_log WHERE user_id IS NULL AND activity_type::text = 'page_view'::text GROUP BY session_id);--> statement-breakpoint
CREATE VIEW "public"."monthly_breakdown_view" WITH (security_invoker = on) AS (WITH monthly_contributions AS ( SELECT EXTRACT(month FROM c.created_at)::integer AS month, EXTRACT(year FROM c.created_at)::integer AS year, c.case_id, c.amount, c.donor_id FROM contributions c WHERE c.status = 'approved'::text ), monthly_stats AS ( SELECT mc.month, mc.year, count(DISTINCT mc.case_id) AS total_cases, sum(mc.amount) AS total_amount, count(DISTINCT mc.donor_id) AS contributors FROM monthly_contributions mc GROUP BY mc.month, mc.year ), category_monthly AS ( SELECT mc.month, mc.year, COALESCE(cc.name_en, cc.name) AS category_name_en, COALESCE(cc.name_ar, cc.name) AS category_name_ar, cc.id AS category_id, sum(mc.amount) AS category_amount, count(DISTINCT mc.case_id) AS category_cases FROM monthly_contributions mc JOIN cases cs ON cs.id = mc.case_id AND cs.status = 'published'::text LEFT JOIN case_categories cc ON cc.id = cs.category_id GROUP BY mc.month, mc.year, cc.id, cc.name_en, cc.name_ar, cc.name ), top_categories AS ( SELECT cm.month, cm.year, cm.category_name_en, cm.category_name_ar, cm.category_id, cm.category_amount, cm.category_cases, row_number() OVER (PARTITION BY cm.month, cm.year ORDER BY cm.category_amount DESC) AS rank FROM category_monthly cm ) SELECT ms.month, ms.year, ms.total_cases, ms.total_amount, ms.contributors, tc.category_name_en AS top_category_name_en, tc.category_name_ar AS top_category_name_ar, tc.category_id AS top_category_id, COALESCE(tc.category_amount, 0::numeric) AS top_category_amount, COALESCE(tc.category_cases, 0::bigint) AS top_category_cases FROM monthly_stats ms LEFT JOIN top_categories tc ON tc.month = ms.month AND tc.year = ms.year AND tc.rank = 1 ORDER BY ms.year DESC, ms.month DESC);--> statement-breakpoint
CREATE POLICY "Users can view their own roles" ON "admin_user_roles" AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));--> statement-breakpoint
CREATE POLICY "Admins can insert user roles" ON "admin_user_roles" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Admins can update user roles" ON "admin_user_roles" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Admins can view all user roles" ON "admin_user_roles" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Super admins can delete menu items" ON "admin_menu_items" AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM (admin_user_roles ur
     JOIN admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = 'super_admin'::text) AND (r.is_active = true)))));--> statement-breakpoint
CREATE POLICY "Super admins can insert menu items" ON "admin_menu_items" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Super admins can update menu items" ON "admin_menu_items" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Super admins can view all menu items" ON "admin_menu_items" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Anyone can view active menu items" ON "admin_menu_items" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Anyone can view active roles" ON "admin_roles" AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));--> statement-breakpoint
CREATE POLICY "Anyone can view active permissions" ON "admin_permissions" AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));--> statement-breakpoint
CREATE POLICY "Admins can insert role permissions" ON "admin_role_permissions" AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_current_user_admin());--> statement-breakpoint
CREATE POLICY "Admins can delete role permissions" ON "admin_role_permissions" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "Anyone can view role permissions" ON "admin_role_permissions" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Anyone can read landing stats" ON "landing_stats" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "Authenticated users can update landing stats" ON "landing_stats" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Authenticated users can insert landing stats" ON "landing_stats" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Users can view own audit logs" ON "audit_logs" AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));--> statement-breakpoint
CREATE POLICY "System can insert audit logs" ON "audit_logs" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Authenticated users can view beneficiaries" ON "beneficiaries" AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));--> statement-breakpoint
CREATE POLICY "Anyone can read system config" ON "system_config" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "Authenticated users can update system config" ON "system_config" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Authenticated users can insert system config" ON "system_config" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Anyone can submit contact form" ON "landing_contacts" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "No updates or deletes" ON "landing_contacts" AS PERMISSIVE FOR ALL TO public;--> statement-breakpoint
CREATE POLICY "Anyone can view active case categories" ON "case_categories" AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));--> statement-breakpoint
CREATE POLICY "Admins can view all case categories" ON "case_categories" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Admins can insert case categories" ON "case_categories" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Admins can update case categories" ON "case_categories" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Admins can delete case categories" ON "case_categories" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "Users can view own notifications" ON "notifications" AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() IS NOT NULL) AND (recipient_id = auth.uid())));--> statement-breakpoint
CREATE POLICY "Users can update own notifications" ON "notifications" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Service can insert notifications" ON "notifications" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Admins can view all notifications" ON "notifications" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Anyone can view active payment methods" ON "payment_methods" AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));--> statement-breakpoint
CREATE POLICY "Admins can view all payment methods" ON "payment_methods" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Admins can insert payment methods" ON "payment_methods" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Admins can update payment methods" ON "payment_methods" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Admins can delete payment methods" ON "payment_methods" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "Public can view public case updates" ON "case_updates" AS PERMISSIVE FOR SELECT TO public USING ((is_public = true));--> statement-breakpoint
CREATE POLICY "Users can view all case updates" ON "case_updates" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Admins can manage case updates" ON "case_updates" AS PERMISSIVE FOR ALL TO public;--> statement-breakpoint
CREATE POLICY "Users can view own cases" ON "cases" AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() IS NOT NULL) AND (created_by = auth.uid())));--> statement-breakpoint
CREATE POLICY "Users can view their own cases" ON "cases" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Admins can insert cases" ON "cases" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Admins can update cases" ON "cases" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Admins can delete cases" ON "cases" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "Admins can view all cases" ON "cases" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Public can view published cases" ON "cases" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can insert own cases" ON "cases" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Admins can insert any cases" ON "cases" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Users can update own cases" ON "cases" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Admins can update any cases" ON "cases" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Public can view approved contributions" ON "contributions" AS PERMISSIVE FOR SELECT TO public USING (check_contribution_approved(id));--> statement-breakpoint
CREATE POLICY "Users can view own contributions" ON "contributions" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Admins can view all contributions" ON "contributions" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can insert own contributions" ON "contributions" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Admins can insert any contributions" ON "contributions" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Users can update own contributions" ON "contributions" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Admins can update any contributions" ON "contributions" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Users can view own profile" ON "users" AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() IS NOT NULL) AND (auth.uid() = id)));--> statement-breakpoint
CREATE POLICY "users all" ON "users" AS PERMISSIVE FOR ALL TO public;--> statement-breakpoint
CREATE POLICY "Admins can view all users" ON "users" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Public can view names for approved contributors" ON "users" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Public can view approved contribution status" ON "contribution_approval_status" AS PERMISSIVE FOR SELECT TO public USING ((status = 'approved'::text));--> statement-breakpoint
CREATE POLICY "Users can view own contribution approval status" ON "contribution_approval_status" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Admins can view all contribution approval statuses" ON "contribution_approval_status" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Admins can insert contribution approval statuses" ON "contribution_approval_status" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Admins can update contribution approval statuses" ON "contribution_approval_status" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Users can update donor reply for own contributions" ON "contribution_approval_status" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Admins can delete contribution approval statuses" ON "contribution_approval_status" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "Anyone can view active category detection rules" ON "category_detection_rules" AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));--> statement-breakpoint
CREATE POLICY "Admins can view all category detection rules" ON "category_detection_rules" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Super admins can manage category detection rules" ON "category_detection_rules" AS PERMISSIVE FOR ALL TO public;--> statement-breakpoint
CREATE POLICY "Authenticated users can view beneficiary documents" ON "beneficiary_documents" AS PERMISSIVE FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));--> statement-breakpoint
CREATE POLICY "Admins can insert beneficiary documents" ON "beneficiary_documents" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Admins can update beneficiary documents" ON "beneficiary_documents" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Admins can delete beneficiary documents" ON "beneficiary_documents" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "Admins have full access to beneficiary documents" ON "beneficiary_documents" AS PERMISSIVE FOR ALL TO public;--> statement-breakpoint
CREATE POLICY "Anyone can view id_types" ON "id_types" AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));--> statement-breakpoint
CREATE POLICY "Anyone can view cities" ON "cities" AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));--> statement-breakpoint
CREATE POLICY "Users can view own activity logs" ON "site_activity_log" AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = user_id) OR (auth.uid() IN ( SELECT admin_user_roles.user_id
   FROM admin_user_roles
  WHERE ((admin_user_roles.role_id IN ( SELECT admin_roles.id
           FROM admin_roles
          WHERE ((admin_roles.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])))) AND (admin_user_roles.is_active = true)))) OR ((user_id IS NULL) AND (auth.uid() IN ( SELECT admin_user_roles.user_id
   FROM admin_user_roles
  WHERE ((admin_user_roles.role_id IN ( SELECT admin_roles.id
           FROM admin_roles
          WHERE ((admin_roles.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])))) AND (admin_user_roles.is_active = true)))))));--> statement-breakpoint
CREATE POLICY "System can insert activity logs" ON "site_activity_log" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Admins can delete activity logs" ON "site_activity_log" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "storage_rules_select" ON "storage_rules" AS PERMISSIVE FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));--> statement-breakpoint
CREATE POLICY "storage_rules_insert" ON "storage_rules" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "storage_rules_update" ON "storage_rules" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "storage_rules_delete" ON "storage_rules" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "Anyone can read active system content" ON "system_content" AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));--> statement-breakpoint
CREATE POLICY "Authenticated users can read all system content" ON "system_content" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Authenticated users can update system content" ON "system_content" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Authenticated users can insert system content" ON "system_content" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Authenticated users can delete system content" ON "system_content" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "Admins can view merge backups" ON "user_merge_backups" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (admin_user_roles aur
     JOIN admin_roles ar ON ((aur.role_id = ar.id)))
  WHERE ((aur.user_id = auth.uid()) AND ((ar.name)::text = 'super_admin'::text)))));--> statement-breakpoint
CREATE POLICY "System can insert merge backups" ON "user_merge_backups" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Admins can update merge backups" ON "user_merge_backups" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Users can update their own push subscriptions" ON "push_subscriptions" AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));--> statement-breakpoint
CREATE POLICY "Users can delete their own push subscriptions" ON "push_subscriptions" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "Admins can view all push subscriptions" ON "push_subscriptions" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can view their own push subscriptions" ON "push_subscriptions" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can insert their own push subscriptions" ON "push_subscriptions" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Users can view their own FCM tokens" ON "fcm_tokens" AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));--> statement-breakpoint
CREATE POLICY "Users can insert their own FCM tokens" ON "fcm_tokens" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Users can update their own FCM tokens" ON "fcm_tokens" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Users can delete their own FCM tokens" ON "fcm_tokens" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "Admins can view all FCM tokens" ON "fcm_tokens" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Admins can view all ai_rules" ON "ai_rules" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (admin_user_roles ur
     JOIN admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));--> statement-breakpoint
CREATE POLICY "Admins can insert ai_rules" ON "ai_rules" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Admins can update ai_rules" ON "ai_rules" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Admins can delete ai_rules" ON "ai_rules" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "Admins can view all ai_rule_parameters" ON "ai_rule_parameters" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (admin_user_roles ur
     JOIN admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));--> statement-breakpoint
CREATE POLICY "Admins can insert ai_rule_parameters" ON "ai_rule_parameters" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Admins can update ai_rule_parameters" ON "ai_rule_parameters" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Admins can delete ai_rule_parameters" ON "ai_rule_parameters" AS PERMISSIVE FOR DELETE TO public;
*/