-- ==========================================
-- Migration: Create Progress Table
-- Description: Stores lesson-level progress tracking
-- ==========================================

-- Create progress table
CREATE TABLE IF NOT EXISTS progress (
  progress_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(enrollment_id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  last_position INTEGER NOT NULL DEFAULT 0 CHECK (last_position >= 0),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_progress_enrollment_id ON progress(enrollment_id);
CREATE INDEX idx_progress_lesson_id ON progress(lesson_id);
CREATE INDEX idx_progress_enrollment_lesson ON progress(enrollment_id, lesson_id);
CREATE INDEX idx_progress_is_completed ON progress(is_completed) WHERE is_completed = true;
CREATE INDEX idx_progress_created_at ON progress(created_at DESC);

-- Unique constraint to prevent duplicate progress records
CREATE UNIQUE INDEX idx_progress_unique_enrollment_lesson ON progress(enrollment_id, lesson_id);

-- Comments for documentation
COMMENT ON TABLE progress IS 'Stores lesson-level progress tracking for enrollments';
COMMENT ON COLUMN progress.progress_id IS 'Unique identifier for the progress record';
COMMENT ON COLUMN progress.enrollment_id IS 'Foreign key reference to enrollment';
COMMENT ON COLUMN progress.lesson_id IS 'Foreign key reference to lesson_id in course service';
COMMENT ON COLUMN progress.is_completed IS 'Whether the lesson has been completed';
COMMENT ON COLUMN progress.last_position IS 'Last video playback position in seconds';
COMMENT ON COLUMN progress.completed_at IS 'Timestamp when lesson was completed';
COMMENT ON COLUMN progress.created_at IS 'Timestamp when progress record was first created';
