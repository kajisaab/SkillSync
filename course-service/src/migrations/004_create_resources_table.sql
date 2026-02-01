-- ==========================================
-- Migration: Create Resources Table
-- Description: Stores lesson resources (PDFs, attachments)
-- ==========================================

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
  resource_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(lesson_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_resources_lesson_id ON resources(lesson_id);
CREATE INDEX idx_resources_created_at ON resources(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE resources IS 'Stores downloadable resources attached to lessons (PDFs, documents, etc.)';
COMMENT ON COLUMN resources.resource_id IS 'Unique identifier for the resource';
COMMENT ON COLUMN resources.lesson_id IS 'Foreign key reference to the parent lesson';
COMMENT ON COLUMN resources.title IS 'Resource title/name';
COMMENT ON COLUMN resources.file_url IS 'URL to the resource file (S3/R2)';
COMMENT ON COLUMN resources.file_type IS 'MIME type of the file (e.g., application/pdf)';
COMMENT ON COLUMN resources.created_at IS 'Timestamp when the resource was created';
