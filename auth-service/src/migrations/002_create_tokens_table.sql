-- ==========================================
-- Migration: Create Tokens Table
-- Description: Stores refresh tokens for JWT authentication
-- ==========================================

-- Create tokens table for refresh token management
CREATE TABLE IF NOT EXISTS tokens (
  token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  refresh_token VARCHAR(512) NOT NULL UNIQUE,
  device_info TEXT,
  ip_address VARCHAR(45),
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_tokens_user_id ON tokens(user_id);
CREATE INDEX idx_tokens_refresh_token ON tokens(refresh_token);
CREATE INDEX idx_tokens_expires_at ON tokens(expires_at);
CREATE INDEX idx_tokens_is_revoked ON tokens(is_revoked) WHERE is_revoked = false;
CREATE INDEX idx_tokens_created_at ON tokens(created_at DESC);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tokens_updated_at
  BEFORE UPDATE ON tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_tokens_updated_at();

-- Comments for documentation
COMMENT ON TABLE tokens IS 'Stores refresh tokens for JWT authentication';
COMMENT ON COLUMN tokens.token_id IS 'Unique identifier for the token record';
COMMENT ON COLUMN tokens.user_id IS 'Foreign key reference to user_id in users table';
COMMENT ON COLUMN tokens.refresh_token IS 'The refresh token string';
COMMENT ON COLUMN tokens.device_info IS 'Information about the device used for login';
COMMENT ON COLUMN tokens.ip_address IS 'IP address from which the token was issued';
COMMENT ON COLUMN tokens.is_revoked IS 'Whether the token has been revoked';
COMMENT ON COLUMN tokens.expires_at IS 'Timestamp when the token expires';
COMMENT ON COLUMN tokens.created_at IS 'Timestamp when the token was created';
COMMENT ON COLUMN tokens.updated_at IS 'Timestamp when the token was last updated';
