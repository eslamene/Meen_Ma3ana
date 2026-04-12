CREATE TABLE "admin_menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"label" text NOT NULL,
	"label_ar" text,
	"href" text NOT NULL,
	"icon" text,
	"description" text,
	"description_ar" text,
	"sort_order" integer DEFAULT 0,
	"permission_id" uuid,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"display_name_ar" text,
	"description" text,
	"description_ar" text,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "admin_role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"display_name_ar" text,
	"description" text,
	"description_ar" text,
	"level" integer DEFAULT 0 NOT NULL,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "admin_user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "ai_rule_parameters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_key" text NOT NULL,
	"parameter_key" text NOT NULL,
	"parameter_value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	CONSTRAINT "ai_rules_rule_key_unique" UNIQUE("rule_key")
);
--> statement-breakpoint
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
CREATE TABLE "beneficiaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_ar" text,
	"age" integer,
	"gender" text,
	"mobile_number" text,
	"additional_mobile_number" text,
	"email" text,
	"alternative_contact" text,
	"national_id" text,
	"id_type" text DEFAULT 'national_id',
	"id_type_id" uuid,
	"address" text,
	"city" text,
	"city_id" uuid,
	"governorate" text,
	"country" text DEFAULT 'Egypt',
	"medical_condition" text,
	"social_situation" text,
	"family_size" integer,
	"dependents" integer,
	"is_verified" boolean DEFAULT false,
	"verification_date" timestamp,
	"verification_notes" text,
	"notes" text,
	"tags" text[],
	"risk_level" text DEFAULT 'low',
	"total_cases" integer DEFAULT 0,
	"active_cases" integer DEFAULT 0,
	"total_amount_received" numeric(15, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "beneficiary_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"is_public" boolean DEFAULT false,
	"description" text,
	"uploaded_at" timestamp DEFAULT now(),
	"uploaded_by" uuid,
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
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text,
	"file_url" text NOT NULL,
	"file_path" text,
	"file_type" text NOT NULL,
	"file_size" integer DEFAULT 0,
	"category" text DEFAULT 'other',
	"description" text,
	"is_public" boolean DEFAULT false,
	"is_primary" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_en" text NOT NULL,
	"title_ar" text,
	"description_ar" text NOT NULL,
	"description_en" text,
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
	"beneficiary_id" uuid,
	"supporting_documents" text,
	"batch_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_detection_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"keyword" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"governorate" text,
	"country" text DEFAULT 'Egypt',
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cities_code_unique" UNIQUE("code")
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
CREATE TABLE "contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"proof_of_payment" text,
	"anonymous" boolean DEFAULT false NOT NULL,
	"donor_id" uuid NOT NULL,
	"case_id" uuid,
	"notes" text,
	"original_contribution_id" uuid,
	"revision_number" integer,
	"revision_explanation" text,
	"message" text,
	"proof_url" text,
	"batch_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fcm_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fcm_token" text NOT NULL,
	"device_id" text,
	"platform" text,
	"user_agent" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "id_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "id_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "landing_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "landing_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stat_key" text NOT NULL,
	"stat_value" numeric(20, 0) DEFAULT '0' NOT NULL,
	"display_format" text,
	"updated_at" timestamp with time zone DEFAULT now(),
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "landing_stats_stat_key_unique" UNIQUE("stat_key")
);
--> statement-breakpoint
CREATE TABLE "localization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"language" text NOT NULL,
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
	CONSTRAINT "nickname_mappings_nickname_unique" UNIQUE("nickname")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"recipient_id" uuid NOT NULL,
	"title" text,
	"message" text,
	"title_en" text,
	"title_ar" text,
	"message_en" text,
	"message_ar" text,
	"data" jsonb,
	"read" boolean DEFAULT false NOT NULL,
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
	CONSTRAINT "payment_methods_code_unique" UNIQUE("code")
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
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "site_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_id" text,
	"activity_type" text NOT NULL,
	"category" text,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" uuid,
	"resource_path" text,
	"method" text,
	"status_code" integer,
	"ip_address" text,
	"user_agent" text,
	"referer" text,
	"details" jsonb,
	"metadata" jsonb,
	"severity" text DEFAULT 'info',
	"created_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "storage_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket_name" text NOT NULL,
	"max_file_size_mb" integer DEFAULT 5 NOT NULL,
	"allowed_extensions" text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "storage_rules_bucket_name_unique" UNIQUE("bucket_name")
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_key" text NOT NULL,
	"config_value" text NOT NULL,
	"description" text,
	"description_ar" text,
	"group_type" text,
	"updated_at" timestamp with time zone DEFAULT now(),
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "system_config_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
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
	CONSTRAINT "system_content_content_key_unique" UNIQUE("content_key")
);
--> statement-breakpoint
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
	CONSTRAINT "user_merge_backups_merge_id_unique" UNIQUE("merge_id")
);
--> statement-breakpoint
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
	"notes" text,
	"tags" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "admin_menu_items" ADD CONSTRAINT "admin_menu_items_parent_id_admin_menu_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."admin_menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_menu_items" ADD CONSTRAINT "admin_menu_items_permission_id_admin_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."admin_permissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_role_id_admin_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_permission_id_admin_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."admin_permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_role_id_admin_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_rule_parameters" ADD CONSTRAINT "ai_rule_parameters_rule_key_ai_rules_rule_key_fk" FOREIGN KEY ("rule_key") REFERENCES "public"."ai_rules"("rule_key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_rules" ADD CONSTRAINT "ai_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_rules" ADD CONSTRAINT "ai_rules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_upload_items" ADD CONSTRAINT "batch_upload_items_batch_id_batch_uploads_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch_uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_upload_items" ADD CONSTRAINT "batch_upload_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_upload_items" ADD CONSTRAINT "batch_upload_items_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_upload_items" ADD CONSTRAINT "batch_upload_items_contribution_id_contributions_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."contributions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_uploads" ADD CONSTRAINT "batch_uploads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_id_type_id_id_types_id_fk" FOREIGN KEY ("id_type_id") REFERENCES "public"."id_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary_documents" ADD CONSTRAINT "beneficiary_documents_beneficiary_id_beneficiaries_id_fk" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."beneficiaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary_documents" ADD CONSTRAINT "beneficiary_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_files" ADD CONSTRAINT "case_files_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_files" ADD CONSTRAINT "case_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_updates" ADD CONSTRAINT "case_updates_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_updates" ADD CONSTRAINT "case_updates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_category_id_case_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."case_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_sponsored_by_users_id_fk" FOREIGN KEY ("sponsored_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_beneficiary_id_beneficiaries_id_fk" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."beneficiaries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_batch_id_batch_uploads_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch_uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_detection_rules" ADD CONSTRAINT "category_detection_rules_category_id_case_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."case_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_detection_rules" ADD CONSTRAINT "category_detection_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_detection_rules" ADD CONSTRAINT "category_detection_rules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_approval_status" ADD CONSTRAINT "contribution_approval_status_contribution_id_contributions_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."contributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_approval_status" ADD CONSTRAINT "contribution_approval_status_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_donor_id_users_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_batch_id_batch_uploads_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch_uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fcm_tokens" ADD CONSTRAINT "fcm_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_stats" ADD CONSTRAINT "landing_stats_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nickname_mappings" ADD CONSTRAINT "nickname_mappings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nickname_mappings" ADD CONSTRAINT "nickname_mappings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_cycles" ADD CONSTRAINT "project_cycles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_contributions" ADD CONSTRAINT "recurring_contributions_donor_id_users_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_contributions" ADD CONSTRAINT "recurring_contributions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_contributions" ADD CONSTRAINT "recurring_contributions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_activity_log" ADD CONSTRAINT "site_activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_sponsor_id_users_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_config" ADD CONSTRAINT "system_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_content" ADD CONSTRAINT "system_content_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_merge_backups" ADD CONSTRAINT "user_merge_backups_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_merge_backups" ADD CONSTRAINT "user_merge_backups_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_merge_backups" ADD CONSTRAINT "user_merge_backups_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;