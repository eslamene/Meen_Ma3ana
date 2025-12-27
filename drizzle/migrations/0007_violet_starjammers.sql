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
ALTER TABLE "cases" RENAME COLUMN "title" TO "title_en";--> statement-breakpoint
ALTER TABLE "cases" RENAME COLUMN "description" TO "description_ar";--> statement-breakpoint
ALTER TABLE "contributions" DROP CONSTRAINT "contributions_original_contribution_id_contributions_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "title" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "message" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "title_ar" text;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "description_en" text;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "beneficiary_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "title_en" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "title_ar" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "message_en" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "message_ar" text;--> statement-breakpoint
ALTER TABLE "admin_menu_items" ADD CONSTRAINT "admin_menu_items_parent_id_admin_menu_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."admin_menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_menu_items" ADD CONSTRAINT "admin_menu_items_permission_id_admin_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."admin_permissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_role_id_admin_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_permission_id_admin_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."admin_permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_role_id_admin_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_id_type_id_id_types_id_fk" FOREIGN KEY ("id_type_id") REFERENCES "public"."id_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary_documents" ADD CONSTRAINT "beneficiary_documents_beneficiary_id_beneficiaries_id_fk" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."beneficiaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary_documents" ADD CONSTRAINT "beneficiary_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_files" ADD CONSTRAINT "case_files_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_files" ADD CONSTRAINT "case_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_detection_rules" ADD CONSTRAINT "category_detection_rules_category_id_case_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."case_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_detection_rules" ADD CONSTRAINT "category_detection_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_detection_rules" ADD CONSTRAINT "category_detection_rules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_stats" ADD CONSTRAINT "landing_stats_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_activity_log" ADD CONSTRAINT "site_activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_config" ADD CONSTRAINT "system_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_content" ADD CONSTRAINT "system_content_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_beneficiary_id_beneficiaries_id_fk" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."beneficiaries"("id") ON DELETE set null ON UPDATE no action;