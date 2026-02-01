-- ==========================================
-- Migration: Create Enrollments Table
-- Description: Stores course enrollments for students
-- ==========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  enrollment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_accessed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_enrollments_user_course ON enrollments(user_id, course_id);
CREATE INDEX idx_enrollments_enrolled_at ON enrollments(enrolled_at DESC);
CREATE INDEX idx_enrollments_completed_at ON enrollments(completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_enrollments_last_accessed ON enrollments(last_accessed DESC);

-- Unique constraint to prevent duplicate enrollments
CREATE UNIQUE INDEX idx_enrollments_unique_user_course ON enrollments(user_id, course_id);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_enrollments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_enrollments_updated_at
  BEFORE UPDATE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_enrollments_updated_at();

-- Comments for documentation
COMMENT ON TABLE enrollments IS 'Stores course enrollments for students';
COMMENT ON COLUMN enrollments.enrollment_id IS 'Unique identifier for the enrollment';
COMMENT ON COLUMN enrollments.user_id IS 'Foreign key reference to user_id in auth service';
COMMENT ON COLUMN enrollments.course_id IS 'Foreign key reference to course_id in course service';
COMMENT ON COLUMN enrollments.progress_percentage IS 'Overall course completion percentage (0-100)';
COMMENT ON COLUMN enrollments.enrolled_at IS 'Timestamp when user enrolled in the course';
COMMENT ON COLUMN enrollments.last_accessed IS 'Timestamp when user last accessed the course';
COMMENT ON COLUMN enrollments.completed_at IS 'Timestamp when course was completed (100%)';
