-- Create invoice_payments table for tracking partial payments
-- AUDIT TRAIL: Every payment is recorded with full details and WHO recorded it

CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Payment details
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMP NOT NULL,
  payment_method VARCHAR(50), -- 'check', 'e-transfer', 'cash', 'credit_card', 'wire_transfer', 'other'
  reference_number VARCHAR(100), -- Check number, transaction ID, confirmation code
  notes TEXT,

  -- Audit trail
  recorded_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add payment tracking fields to invoices table
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  ADD COLUMN IF NOT EXISTS balance_remaining DECIMAL(10,2);

-- Update balance_remaining for existing invoices
UPDATE invoices
SET balance_remaining = total - amount_paid
WHERE balance_remaining IS NULL;

-- Add NOT NULL constraint after backfilling
ALTER TABLE invoices
  ALTER COLUMN balance_remaining SET NOT NULL;

-- Indexes for performance
CREATE INDEX idx_invoice_payments_invoice ON invoice_payments(invoice_id);
CREATE INDEX idx_invoice_payments_tenant ON invoice_payments(tenant_id);
CREATE INDEX idx_invoice_payments_date ON invoice_payments(payment_date);
CREATE INDEX idx_invoice_payments_recorded_by ON invoice_payments(recorded_by);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_invoice_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_payments_updated_at_trigger
  BEFORE UPDATE ON invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_payments_updated_at();

-- Comments for documentation
COMMENT ON TABLE invoice_payments IS 'Tracks all partial payments applied to invoices with complete audit trail';
COMMENT ON COLUMN invoice_payments.amount IS 'Payment amount in dollars (must be positive)';
COMMENT ON COLUMN invoice_payments.payment_date IS 'Date payment was received (not necessarily when recorded)';
COMMENT ON COLUMN invoice_payments.payment_method IS 'How payment was received: check, e-transfer, cash, credit_card, wire_transfer, other';
COMMENT ON COLUMN invoice_payments.reference_number IS 'Check number, transaction ID, or other reference identifier';
COMMENT ON COLUMN invoice_payments.recorded_by IS 'User ID of CD/SA who recorded this payment';
COMMENT ON COLUMN invoices.amount_paid IS 'Sum of all payments applied to this invoice';
COMMENT ON COLUMN invoices.balance_remaining IS 'Calculated as: total - amount_paid (what studio still owes)';
