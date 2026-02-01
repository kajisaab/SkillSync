-- ==========================================
-- Migration: Create Sections Table
-- Description: Stores course sections/modules
-- ==========================================

-- Create sections table
CREATE TABLE IF NOT EXISTS sections (
  section_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX idx_sections_course_id ON sections(course_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sections_order_index ON sections(course_id, order_index) WHERE deleted_at IS NULL;
CREATE INDEX idx_sections_deleted_at ON sections(deleted_at);

-- Constraint to ensure unique order_index per course (excluding soft-deleted)
CREATE UNIQUE INDEX idx_sections_unique_order
  ON sections(course_id, order_index)
  WHERE deleted_at IS NULL;

-- Comments for documentation
COMMENT ON TABLE sections IS 'Stores course sections/modules that group lessons together';
COMMENT ON COLUMN sections.section_id IS 'Unique identifier for the section';
COMMENT ON COLUMN sections.course_id IS 'Foreign key reference to the parent course';
COMMENT ON COLUMN sections.title IS 'Section title';
COMMENT ON COLUMN sections.order_index IS 'Display order within the course (0-based)';
COMMENT ON COLUMN sections.deleted_at IS 'Soft delete timestamp';
