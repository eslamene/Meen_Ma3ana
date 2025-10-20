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
ALTER TABLE "recurring_contributions" ADD CONSTRAINT "recurring_contributions_donor_id_users_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_contributions" ADD CONSTRAINT "recurring_contributions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_contributions" ADD CONSTRAINT "recurring_contributions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;