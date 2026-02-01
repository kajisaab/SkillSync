/**
 * Integration Tests: Enrollment API
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-secret';

// Helper function to generate test JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });
};

// Test data
const studentPayload = {
  userId: '11111111-1111-1111-1111-111111111111',
  email: 'student@test.com',
  role: 'student',
};

const instructorPayload = {
  userId: '22222222-2222-2222-2222-222222222222',
  email: 'instructor@test.com',
  role: 'instructor',
};

let studentToken;
let instructorToken;
const testCourseId = '99999999-9999-9999-9999-999999999999'; // Mock course ID

describe('Enrollment API Integration Tests', () => {
  beforeAll(async () => {
    // Generate tokens
    studentToken = generateToken(studentPayload);
    instructorToken = generateToken(instructorPayload);

    // Clean up test data
    await pool.query('DELETE FROM enrollments WHERE user_id = $1', [studentPayload.userId]);
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM enrollments WHERE user_id = $1', [studentPayload.userId]);
    await pool.end();
  });

  describe('POST /api/enrollments', () => {
    it('should reject enrollment without authentication', async () => {
      const enrollmentData = {
        courseId: testCourseId,
      };

      const response = await request(app)
        .post('/api/enrollments')
        .send(enrollmentData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Authorization header');
    });

    it('should reject enrollment with invalid course ID format', async () => {
      const enrollmentData = {
        courseId: 'invalid-uuid',
      };

      const response = await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(enrollmentData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    // Note: Full enrollment test would require Course Service to be running
    // or mocked to verify course exists
  });

  describe('GET /api/enrollments', () => {
    it('should get user enrollments with authentication', async () => {
      const response = await request(app)
        .get('/api/enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('currentPage');
      expect(response.body.pagination).toHaveProperty('totalItems');
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/enrollments?page=1&limit=5')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.itemsPerPage).toBe(5);
    });

    it('should reject without authentication', async () => {
      const response = await request(app).get('/api/enrollments').expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/enrollments/check/:courseId', () => {
    it('should check enrollment status for a course', async () => {
      const response = await request(app)
        .get(`/api/enrollments/check/${testCourseId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isEnrolled');
    });

    it('should reject invalid course ID format', async () => {
      const response = await request(app)
        .get('/api/enrollments/check/invalid-id')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });
});
