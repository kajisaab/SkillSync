const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');

describe('Section API Integration Tests', () => {
  let authToken;
  let courseId;
  let sectionId;

  beforeAll(async () => {
    // Setup: Create a test instructor and get auth token
    // In real integration tests, this would authenticate against auth service
    authToken = 'Bearer test_jwt_token_for_instructor';

    // Create a test course
    const courseResponse = await request(app)
      .post('/api/courses')
      .set('Authorization', authToken)
      .send({
        title: 'Test Course for Sections',
        description: 'Test Description',
        category: 'Programming',
        price: 4999,
        thumbnail_url: 'https://example.com/thumb.jpg'
      });

    if (courseResponse.body && courseResponse.body.course_id) {
      courseId = courseResponse.body.course_id;
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    if (sectionId) {
      await db.query('DELETE FROM sections WHERE section_id = $1', [sectionId]);
    }
    if (courseId) {
      await db.query('DELETE FROM courses WHERE course_id = $1', [courseId]);
    }
    await db.end();
  });

  describe('POST /api/courses/:courseId/sections', () => {
    it('should create a new section', async () => {
      const response = await request(app)
        .post(`/api/courses/${courseId}/sections`)
        .set('Authorization', authToken)
        .send({
          title: 'Introduction',
          order_index: 1
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('section_id');
      expect(response.body.title).toBe('Introduction');
      expect(response.body.course_id).toBe(courseId);
      expect(response.body.order_index).toBe(1);

      sectionId = response.body.section_id;
    });

    it('should return 400 if title is missing', async () => {
      const response = await request(app)
        .post(`/api/courses/${courseId}/sections`)
        .set('Authorization', authToken)
        .send({
          order_index: 2
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post(`/api/courses/${courseId}/sections`)
        .send({
          title: 'Unauthorized Section',
          order_index: 1
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/courses/:courseId/sections', () => {
    it('should get all sections for a course', async () => {
      const response = await request(app)
        .get(`/api/courses/${courseId}/sections`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('section_id');
      expect(response.body[0]).toHaveProperty('title');
    });

    it('should return empty array for course with no sections', async () => {
      const response = await request(app)
        .get('/api/courses/non-existent-course-id/sections');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('PUT /api/courses/:courseId/sections/:sectionId', () => {
    it('should update section title', async () => {
      const response = await request(app)
        .put(`/api/courses/${courseId}/sections/${sectionId}`)
        .set('Authorization', authToken)
        .send({
          title: 'Updated Introduction'
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Introduction');
      expect(response.body.section_id).toBe(sectionId);
    });

    it('should update section order', async () => {
      const response = await request(app)
        .put(`/api/courses/${courseId}/sections/${sectionId}`)
        .set('Authorization', authToken)
        .send({
          order_index: 5
        });

      expect(response.status).toBe(200);
      expect(response.body.order_index).toBe(5);
    });

    it('should return 404 if section not found', async () => {
      const response = await request(app)
        .put(`/api/courses/${courseId}/sections/non-existent-section-id`)
        .set('Authorization', authToken)
        .send({
          title: 'Updated Title'
        });

      expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .put(`/api/courses/${courseId}/sections/${sectionId}`)
        .send({
          title: 'Unauthorized Update'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/courses/:courseId/sections/:sectionId', () => {
    it('should delete a section', async () => {
      // Create a section to delete
      const createResponse = await request(app)
        .post(`/api/courses/${courseId}/sections`)
        .set('Authorization', authToken)
        .send({
          title: 'Section to Delete',
          order_index: 99
        });

      const deleteSectionId = createResponse.body.section_id;

      const response = await request(app)
        .delete(`/api/courses/${courseId}/sections/${deleteSectionId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 404 if section not found', async () => {
      const response = await request(app)
        .delete(`/api/courses/${courseId}/sections/non-existent-section-id`)
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .delete(`/api/courses/${courseId}/sections/${sectionId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/courses/:courseId/sections/reorder', () => {
    it('should reorder sections successfully', async () => {
      // Create multiple sections
      const section1 = await request(app)
        .post(`/api/courses/${courseId}/sections`)
        .set('Authorization', authToken)
        .send({ title: 'Section A', order_index: 1 });

      const section2 = await request(app)
        .post(`/api/courses/${courseId}/sections`)
        .set('Authorization', authToken)
        .send({ title: 'Section B', order_index: 2 });

      const response = await request(app)
        .put(`/api/courses/${courseId}/sections/reorder`)
        .set('Authorization', authToken)
        .send({
          sections: [
            { section_id: section2.body.section_id, order_index: 1 },
            { section_id: section1.body.section_id, order_index: 2 }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('reordered');

      // Cleanup
      await db.query('DELETE FROM sections WHERE section_id = $1', [section1.body.section_id]);
      await db.query('DELETE FROM sections WHERE section_id = $1', [section2.body.section_id]);
    });
  });
});
