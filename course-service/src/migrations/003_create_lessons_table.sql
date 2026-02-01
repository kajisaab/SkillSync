-- ==========================================
-- Migration: Create Lessons Table
-- Description: Stores individual lessons within sections
-- ==========================================

-- Create lessons table
CREATE TABLE IF NOT EXISTS lessons (
  lesson_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL REFERENCES sections(section_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url VARCHAR(500),
  video_duration INTEGER, -- Duration in seconds
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX idx_lessons_section_id ON lessons(section_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lessons_order_index ON lessons(section_id, order_index) WHERE deleted_at IS NULL;
CREATE INDEX idx_lessons_deleted_at ON lessons(deleted_at);

-- Constraint to ensure unique order_index per section (excluding soft-deleted)
CREATE UNIQUE INDEX idx_lessons_unique_order
  ON lessons(section_id, order_index)
  WHERE deleted_at IS NULL;

-- Comments for documentation
COMMENT ON TABLE lessons IS 'Stores individual lessons within course sections';
COMMENT ON COLUMN lessons.lesson_id IS 'Unique identifier for the lesson';
COMMENT ON COLUMN lessons.section_id IS 'Foreign key reference to the parent section';
COMMENT ON COLUMN lessons.title IS 'Lesson title';
COMMENT ON COLUMN lessons.description IS 'Optional lesson description';
COMMENT ON COLUMN lessons.video_url IS 'URL to the lesson video (S3/R2)';
COMMENT ON COLUMN lessons.video_duration IS 'Video duration in seconds';
COMMENT ON COLUMN lessons.order_index IS 'Display order within the section (0-based)';
COMMENT ON COLUMN lessons.deleted_at IS 'Soft delete timestamp';
