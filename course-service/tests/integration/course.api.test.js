/**
 * Integration Tests: Course API
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');
const { redisClient } = require('../../src/config/redis');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-secret';

// Helper function to generate test JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });
};

// Test data
const instructorPayload = {
  userId: '11111111-1111-1111-1111-111111111111',
  email: 'instructor@test.com',
  role: 'instructor',
};

const studentPayload = {
  userId: '22222222-2222-2222-2222-222222222222',
  email: 'student@test.com',
  role: 'student',
};

let instructorToken;
let studentToken;
let testCourseId;

describe('Course API Integration Tests', () => {
  beforeAll(async () => {
    // Generate tokens
    instructorToken = generateToken(instructorPayload);
    studentToken = generateToken(studentPayload);

    // Clean up test data
    await pool.query('DELETE FROM courses WHERE instructor_id = $1', [instructorPayload.userId]);
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM courses WHERE instructor_id = $1', [instructorPayload.userId]);
    await redisClient.flushDb();
    await pool.end();
    await redisClient.quit();
  });

  describe('POST /api/courses', () => {
    it('should create a new course with valid instructor token', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'This is a test course description',
        category: 'Programming',
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        price: 49.99,
      };

      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(courseData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('courseId');
      expect(response.body.data.title).toBe(courseData.title);
      expect(response.body.data.description).toBe(courseData.description);
      expect(response.body.data.category).toBe(courseData.category);
      expect(response.body.data.price).toBe(courseData.price);
      expect(response.body.data.isPublished).toBe(false);
      expect(response.body.data.instructorId).toBe(instructorPayload.userId);

      testCourseId = response.body.data.courseId;
    });

    it('should reject course creation without authentication', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'This is a test course',
        category: 'Programming',
        price: 49.99,
      };

      const response = await request(app)
        .post('/api/courses')
        .send(courseData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Authorization header');
    });

    it('should reject course creation from student', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'This is a test course',
        category: 'Programming',
        price: 49.99,
      };

      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(courseData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Required role');
    });

    it('should reject invalid course data', async () => {
      const invalidData = {
        title: 'AB', // Too short
        description: 'Short', // Too short
        category: 'Programming',
        price: -10, // Negative price
      };

      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(invalidData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/courses', () => {
    it('should get paginated list of courses', async () => {
      const response = await request(app)
        .get('/api/courses')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('currentPage');
      expect(response.body.pagination).toHaveProperty('totalItems');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/courses?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.itemsPerPage).toBe(5);
    });

    it('should support category filter', async () => {
      const response = await request(app)
        .get('/api/courses?category=Programming')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should support search filter', async () => {
      const response = await request(app)
        .get('/api/courses?search=Test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/courses/:courseId', () => {
    it('should get course by ID', async () => {
      const response = await request(app)
        .get(`/api/courses/${testCourseId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.courseId).toBe(testCourseId);
      expect(response.body.data.title).toBe('Test Course');
    });

    it('should return 404 for non-existent course', async () => {
      const fakeId = '99999999-9999-9999-9999-999999999999';

      const response = await request(app)
        .get(`/api/courses/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    it('should return 422 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/courses/invalid-id')
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/courses/:courseId', () => {
    it('should update course with valid data', async () => {
      const updateData = {
        title: 'Updated Test Course',
        description: 'Updated description',
        price: 59.99,
      };

      const response = await request(app)
        .put(`/api/courses/${testCourseId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.price).toBe(updateData.price);
    });

    it('should reject update without authentication', async () => {
      const updateData = { title: 'Updated Title' };

      const response = await request(app)
        .put(`/api/courses/${testCourseId}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject update from non-owner instructor', async () => {
      const otherInstructorToken = generateToken({
        userId: '33333333-3333-3333-3333-333333333333',
        email: 'other@test.com',
        role: 'instructor',
      });

      const updateData = { title: 'Hacked Title' };

      const response = await request(app)
        .put(`/api/courses/${testCourseId}`)
        .set('Authorization', `Bearer ${otherInstructorToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('permission');
    });
  });

  describe('POST /api/courses/:courseId/publish', () => {
    it('should reject publishing course without sections', async () => {
      const response = await request(app)
        .post(`/api/courses/${testCourseId}/publish`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('at least one section');
    });
  });

  describe('DELETE /api/courses/:courseId', () => {
    it('should soft delete course', async () => {
      const response = await request(app)
        .delete(`/api/courses/${testCourseId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('deleted successfully');

      // Verify course is soft deleted
      const getResponse = await request(app)
        .get(`/api/courses/${testCourseId}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
    });

    it('should reject delete without authentication', async () => {
      const response = await request(app)
        .delete(`/api/courses/${testCourseId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
