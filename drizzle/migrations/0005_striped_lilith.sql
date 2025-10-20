ALTER TABLE "contributions" ADD COLUMN "original_contribution_id" uuid;--> statement-breakpoint
ALTER TABLE "contributions" ADD COLUMN "revision_number" integer;--> statement-breakpoint
ALTER TABLE "contributions" ADD COLUMN "revision_explanation" text;--> statement-breakpoint
ALTER TABLE "contributions" ADD COLUMN "message" text;--> statement-breakpoint
ALTER TABLE "contributions" ADD COLUMN "proof_url" text;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_original_contribution_id_contributions_id_fk" FOREIGN KEY ("original_contribution_id") REFERENCES "public"."contributions"("id") ON DELETE no action ON UPDATE no action;