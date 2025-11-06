-- Add margin tracking fields to sub_invoices
-- Allows Studio Directors to add profit margin when splitting invoices by dancer
-- Margin is invisible to parents (blended into subtotal)

-- Add margin fields to sub_invoices
ALTER TABLE sub_invoices ADD COLUMN margin_type VARCHAR(50);
ALTER TABLE sub_invoices ADD COLUMN margin_value NUMERIC(10,2);
ALTER TABLE sub_invoices ADD COLUMN margin_amount NUMERIC(10,2);
ALTER TABLE sub_invoices ADD COLUMN original_subtotal NUMERIC(10,2);

-- Add column comments
COMMENT ON COLUMN sub_invoices.margin_type IS 'Type of margin applied: percentage_per_routine | fixed_per_routine | percentage_per_dancer | fixed_per_dancer | NULL (no margin)';
COMMENT ON COLUMN sub_invoices.margin_value IS 'Input value: 10 for 10% or 5.00 for $5 fixed';
COMMENT ON COLUMN sub_invoices.margin_amount IS 'Calculated dollar margin for SD profit tracking';
COMMENT ON COLUMN sub_invoices.original_subtotal IS 'Subtotal before margin was added (for SD reporting)';

-- Add margin tracking to main invoices
ALTER TABLE invoices ADD COLUMN has_dancer_invoices BOOLEAN DEFAULT FALSE;
ALTER TABLE invoices ADD COLUMN total_margin_applied NUMERIC(10,2);

-- Add column comments
COMMENT ON COLUMN invoices.has_dancer_invoices IS 'True if this invoice has been split into dancer invoices';
COMMENT ON COLUMN invoices.total_margin_applied IS 'Sum of all margin across dancer invoices (for SD reporting)';
