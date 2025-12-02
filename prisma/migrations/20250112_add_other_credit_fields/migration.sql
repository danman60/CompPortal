-- Add other_credit_amount and other_credit_reason fields to invoices table
-- This allows invoices to have BOTH percentage discounts AND fixed credit amounts

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS other_credit_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_credit_reason TEXT;

-- Add comment to document purpose
COMMENT ON COLUMN invoices.other_credit_amount IS 'Fixed dollar credit amount (separate from percentage discounts in credit_amount)';
COMMENT ON COLUMN invoices.other_credit_reason IS 'Reason for other credit (e.g., loyalty credit, refund, etc.)';
