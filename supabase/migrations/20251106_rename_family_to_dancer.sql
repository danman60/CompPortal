-- Rename family fields to dancer fields for clarity
-- Invoice splitting is per-dancer, not per-family
-- This aligns database naming with actual business logic

-- Rename columns
ALTER TABLE sub_invoices
  RENAME COLUMN family_identifier TO dancer_id;

ALTER TABLE sub_invoices
  RENAME COLUMN family_name TO dancer_name;

-- Update index names
DROP INDEX IF EXISTS idx_sub_invoices_family;
CREATE INDEX idx_sub_invoices_dancer ON sub_invoices(dancer_id);

-- Add column comments for clarity
COMMENT ON COLUMN sub_invoices.dancer_id IS 'UUID of the dancer this invoice belongs to';
COMMENT ON COLUMN sub_invoices.dancer_name IS 'Full name of dancer (first + last name)';
