const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');

describe('Progress API Integration Tests', () => {
  let authToken;
  let enrollmentId;
  let lessonId;

  beforeAll(async () => {
    // Setup: Get auth token for student
    authToken = 'Bearer test_jwt_token_for_student';

    // Create test enrollment
    const enrollment = await db.query(
      'INSERT INTO enrollments (user_id, course_id, progress_percentage) VALUES ($1, $2, $3) RETURNING *',
      ['test-user-123', 'test-course-123', 0]
    );
    enrollmentId = enrollment.rows[0].enrollment_id;

    // Mock lesson ID
    lessonId = 'test-lesson-123';
  });

  afterAll(async () => {
    // Cleanup
    await db.query('DELETE FROM progress WHERE enrollment_id = $1', [enrollmentId]);
    await db.query('DELETE FROM enrollments WHERE enrollment_id = $1', [enrollmentId]);
    await db.end();
  });

  describe('POST /api/progress/update', () => {
    it('should update lesson progress successfully', async () => {
      const response = await request(app)
        .post('/api/progress/update')
        .set('Authorization', authToken)
        .send({
          enrollment_id: enrollmentId,
          lesson_id: lessonId,
          is_completed: false,
          last_position: 450
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('progress_id');
      expect(response.body.last_position).toBe(450);
      expect(response.body.is_completed).toBe(false);
    });

    it('should mark lesson as complete', async () => {
      const response = await request(app)
        .post('/api/progress/update')
        .set('Authorization', authToken)
        .send({
          enrollment_id: enrollmentId,
          lesson_id: lessonId,
          is_completed: true,
          last_position: 0
        });

      expect(response.status).toBe(200);
      expect(response.body.is_completed).toBe(true);
      expect(response.body).toHaveProperty('completed_at');
    });

    it('should return 400 if enrollment_id is missing', async () => {
      const response = await request(app)
        .post('/api/progress/update')
        .set('Authorization', authToken)
        .send({
          lesson_id: lessonId,
          is_completed: true
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if lesson_id is missing', async () => {
      const response = await request(app)
        .post('/api/progress/update')
        .set('Authorization', authToken)
        .send({
          enrollment_id: enrollmentId,
          is_completed: true
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/progress/update')
        .send({
          enrollment_id: enrollmentId,
          lesson_id: lessonId,
          is_completed: true
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/progress/:enrollmentId', () => {
    it('should get all progress for an enrollment', async () => {
      const response = await request(app)
        .get(`/api/progress/${enrollmentId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('progress_id');
        expect(response.body[0]).toHaveProperty('lesson_id');
        expect(response.body[0]).toHaveProperty('is_completed');
      }
    });

    it('should return 404 if enrollment not found', async () => {
      const response = await request(app)
        .get('/api/progress/non-existent-enrollment')
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get(`/api/progress/${enrollmentId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/progress/:enrollmentId/lesson/:lessonId', () => {
    it('should get progress for specific lesson', async () => {
      // First create some progress
      await request(app)
        .post('/api/progress/update')
        .set('Authorization', authToken)
        .send({
          enrollment_id: enrollmentId,
          lesson_id: lessonId,
          is_completed: false,
          last_position: 600
        });

      const response = await request(app)
        .get(`/api/progress/${enrollmentId}/lesson/${lessonId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('lesson_id', lessonId);
      expect(response.body).toHaveProperty('last_position');
    });

    it('should return 404 if no progress found', async () => {
      const response = await request(app)
        .get(`/api/progress/${enrollmentId}/lesson/non-existent-lesson`)
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/progress/:enrollmentId/stats', () => {
    it('should get completion statistics', async () => {
      const response = await request(app)
        .get(`/api/progress/${enrollmentId}/stats`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_lessons');
      expect(response.body).toHaveProperty('completed_lessons');
      expect(response.body).toHaveProperty('progress_percentage');
      expect(typeof response.body.progress_percentage).toBe('number');
    });
  });

  describe('GET /api/progress/:enrollmentId/last-watched', () => {
    it('should get last watched lesson', async () => {
      const response = await request(app)
        .get(`/api/progress/${enrollmentId}/last-watched`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      if (response.body) {
        expect(response.body).toHaveProperty('lesson_id');
        expect(response.body).toHaveProperty('last_position');
      }
    });
  });

  describe('DELETE /api/progress/:enrollmentId/reset', () => {
    it('should reset all progress for enrollment', async () => {
      const response = await request(app)
        .delete(`/api/progress/${enrollmentId}/reset`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('reset');

      // Verify progress was deleted
      const verifyResponse = await request(app)
        .get(`/api/progress/${enrollmentId}`)
        .set('Authorization', authToken);

      expect(verifyResponse.body).toHaveLength(0);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .delete(`/api/progress/${enrollmentId}/reset`);

      expect(response.status).toBe(401);
    });
  });
});
