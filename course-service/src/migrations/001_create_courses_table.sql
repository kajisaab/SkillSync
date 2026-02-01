-- ==========================================
-- Migration: Create Courses Table
-- Description: Stores course information
-- ==========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  course_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instructor_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  thumbnail_url VARCHAR(500),
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX idx_courses_instructor_id ON courses(instructor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_courses_category ON courses(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_courses_is_published ON courses(is_published) WHERE deleted_at IS NULL;
CREATE INDEX idx_courses_deleted_at ON courses(deleted_at);
CREATE INDEX idx_courses_created_at ON courses(created_at DESC) WHERE deleted_at IS NULL;

-- Full-text search index on title and description
CREATE INDEX idx_courses_search ON courses USING gin(to_tsvector('english', title || ' ' || description)) WHERE deleted_at IS NULL;

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_courses_updated_at();

-- Comments for documentation
COMMENT ON TABLE courses IS 'Stores course information created by instructors';
COMMENT ON COLUMN courses.course_id IS 'Unique identifier for the course';
COMMENT ON COLUMN courses.instructor_id IS 'Foreign key reference to user_id in auth service';
COMMENT ON COLUMN courses.title IS 'Course title';
COMMENT ON COLUMN courses.description IS 'Detailed course description';
COMMENT ON COLUMN courses.category IS 'Course category (e.g., Programming, Design, Business)';
COMMENT ON COLUMN courses.thumbnail_url IS 'URL to course thumbnail image';
COMMENT ON COLUMN courses.price IS 'Course price in USD';
COMMENT ON COLUMN courses.is_published IS 'Whether the course is published and visible to students';
COMMENT ON COLUMN courses.deleted_at IS 'Soft delete timestamp';
