-- ==========================================
-- Migration: Create Transactions Table
-- Description: Stores payment transaction records
-- Author: SkillSync Team
-- Date: 2024
-- ==========================================

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  amount INTEGER NOT NULL, -- Amount in cents
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  stripe_payment_id VARCHAR(255),
  stripe_session_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT transactions_status_check CHECK (
    status IN ('pending', 'succeeded', 'failed', 'cancelled')
  ),
  CONSTRAINT transactions_amount_positive CHECK (amount > 0),
  CONSTRAINT transactions_currency_length CHECK (char_length(currency) = 3)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_user_id
  ON transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_course_id
  ON transactions(course_id);

CREATE INDEX IF NOT EXISTS idx_transactions_status
  ON transactions(status);

CREATE INDEX IF NOT EXISTS idx_transactions_stripe_payment_id
  ON transactions(stripe_payment_id)
  WHERE stripe_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_stripe_session_id
  ON transactions(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_user_course
  ON transactions(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at
  ON transactions(created_at DESC);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_transactions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE transactions IS 'Stores all payment transactions for course purchases';
COMMENT ON COLUMN transactions.transaction_id IS 'Unique identifier for the transaction';
COMMENT ON COLUMN transactions.user_id IS 'Reference to user who made the purchase';
COMMENT ON COLUMN transactions.course_id IS 'Reference to purchased course';
COMMENT ON COLUMN transactions.amount IS 'Payment amount in cents';
COMMENT ON COLUMN transactions.currency IS 'ISO 4217 currency code';
COMMENT ON COLUMN transactions.status IS 'Transaction status: pending, succeeded, failed, cancelled';
COMMENT ON COLUMN transactions.stripe_payment_id IS 'Stripe payment intent ID';
COMMENT ON COLUMN transactions.stripe_session_id IS 'Stripe checkout session ID';
COMMENT ON COLUMN transactions.metadata IS 'Additional transaction metadata (course title, category, etc.)';
