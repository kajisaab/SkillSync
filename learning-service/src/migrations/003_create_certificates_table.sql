-- ==========================================
-- Migration: Create Certificates Table
-- Description: Stores course completion certificates for students
-- ==========================================

-- Create certificates table
CREATE TABLE IF NOT EXISTS certificates (
  certificate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(enrollment_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  certificate_number VARCHAR(50) NOT NULL UNIQUE,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  certificate_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_certificates_enrollment_id ON certificates(enrollment_id);
CREATE INDEX idx_certificates_user_id ON certificates(user_id);
CREATE INDEX idx_certificates_course_id ON certificates(course_id);
CREATE INDEX idx_certificates_certificate_number ON certificates(certificate_number);
CREATE INDEX idx_certificates_issued_at ON certificates(issued_at DESC);
CREATE INDEX idx_certificates_user_course ON certificates(user_id, course_id);

-- Unique constraint to prevent duplicate certificates per enrollment
CREATE UNIQUE INDEX idx_certificates_unique_enrollment ON certificates(enrollment_id);

-- Comments for documentation
COMMENT ON TABLE certificates IS 'Stores course completion certificates for students';
COMMENT ON COLUMN certificates.certificate_id IS 'Unique identifier for the certificate';
COMMENT ON COLUMN certificates.enrollment_id IS 'Foreign key reference to enrollment';
COMMENT ON COLUMN certificates.user_id IS 'Foreign key reference to user_id in auth service';
COMMENT ON COLUMN certificates.course_id IS 'Foreign key reference to course_id in course service';
COMMENT ON COLUMN certificates.certificate_number IS 'Unique certificate number for verification';
COMMENT ON COLUMN certificates.issued_at IS 'Timestamp when the certificate was issued';
COMMENT ON COLUMN certificates.certificate_url IS 'URL to the generated certificate PDF';
COMMENT ON COLUMN certificates.created_at IS 'Timestamp when the record was created';
