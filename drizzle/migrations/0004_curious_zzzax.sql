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
ALTER TABLE "contributions" DROP CONSTRAINT "contributions_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "contributions" DROP CONSTRAINT "contributions_project_cycle_id_project_cycles_id_fk";
--> statement-breakpoint
ALTER TABLE "contributions" ADD COLUMN "anonymous" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contribution_approval_status" ADD CONSTRAINT "contribution_approval_status_contribution_id_contributions_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."contributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_approval_status" ADD CONSTRAINT "contribution_approval_status_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "contributions" DROP COLUMN "project_cycle_id";