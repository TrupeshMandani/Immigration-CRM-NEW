CREATE TABLE "documents" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" text NOT NULL,
	"student_id" text NOT NULL,
	"document_type" text,
	"s3_key" text,
	"s3_bucket" text,
	"mime_type" text,
	"size_bytes" integer,
	"version" integer DEFAULT 1,
	"file_hash" text,
	"ai_verification" jsonb DEFAULT '{}'::jsonb,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" text NOT NULL,
	"status" text DEFAULT 'registered' NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text NOT NULL,
	"profile_data" jsonb DEFAULT '{}'::jsonb,
	"ai_key" text NOT NULL,
	"assigned_to" text,
	"stage" text DEFAULT 'lead' NOT NULL,
	"state_data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "students_ai_key_unique" UNIQUE("ai_key"),
	CONSTRAINT "students_firm_email_unique" UNIQUE("firm_id","email"),
	CONSTRAINT "students_status_check" CHECK (status IN ('pending','registered','active','closed')),
	CONSTRAINT "students_stage_check" CHECK (stage IN ('lead','study_permit','pgwp','pr','citizenship'))
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;