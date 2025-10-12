-- Add Stripe payment fields to invoices table
ALTER TABLE "public"."invoices"
ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "stripe_customer_id" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR(50);

-- Add indexes for Stripe lookups
CREATE INDEX IF NOT EXISTS "idx_invoices_stripe_payment_intent" ON "public"."invoices"("stripe_payment_intent_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_stripe_customer" ON "public"."invoices"("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_paid_at" ON "public"."invoices"("paid_at");
