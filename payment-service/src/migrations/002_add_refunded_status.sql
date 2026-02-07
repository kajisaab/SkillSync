-- ==========================================
-- Migration: Add 'refunded' status to transactions
-- Description: The saga compensation sets status to 'refunded' but the
--              CHECK constraint only allowed pending/succeeded/failed/cancelled.
-- ==========================================

-- Drop existing constraint and recreate with 'refunded' status
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_status_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_status_check CHECK (
    status IN ('pending', 'succeeded', 'failed', 'cancelled', 'refunded')
  );
