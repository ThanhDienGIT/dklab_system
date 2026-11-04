CREATE TABLE "addon_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"target" text NOT NULL,
	"months" integer DEFAULT 1 NOT NULL,
	"amount" bigint DEFAULT 0 NOT NULL,
	"code" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_by" uuid,
	"approved_by" uuid,
	"paid_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "addon_orders_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "tenant_modules" ADD COLUMN "source" text DEFAULT 'industry' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_modules" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "plan_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "addon_orders" ADD CONSTRAINT "addon_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addon_orders" ADD CONSTRAINT "addon_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addon_orders_tenant_idx" ON "addon_orders" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "addon_orders_status_idx" ON "addon_orders" USING btree ("status");--> statement-breakpoint
-- Doanh nghiệp tạo trước khi có cửa hàng: giữ nguyên tính năng đang dùng (lên gói Chuyên nghiệp)
UPDATE "tenants" SET "plan" = 'pro' WHERE "plan" = 'basic';
