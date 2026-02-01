const request = require("supertest");
const app = require("../../src/app");

// Mock database and Redis
jest.mock("../../src/config/database", () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
  closePool: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../src/config/redis", () => ({
  redisClient: { connect: jest.fn(), quit: jest.fn() },
  connectRedis: jest.fn().mockResolvedValue(undefined),
  setCache: jest.fn().mockResolvedValue(undefined),
  getCache: jest.fn().mockResolvedValue(null),
  delCache: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(false),
  closeRedis: jest.fn().mockResolvedValue(undefined),
}));

const { query } = require("../../src/config/database");
const { getCache } = require("../../src/config/redis");

describe("Auth API Integration Tests", () => {
  let testUser;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      // Mock: no existing user
      query.mockResolvedValueOnce({ rows: [] });
      // Mock: create user
      query.mockResolvedValueOnce({
        rows: [
          {
            user_id: "user-123",
            email: "test1@integration.com",
            role: "student",
            first_name: "Test",
            last_name: "User",
            avatar_url: null,
            is_email_verified: false,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });
      // Mock: set verification token
      query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test1@integration.com",
          password: "StrongPass123!",
          firstName: "Test",
          lastName: "User",
          role: "student",
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe("test1@integration.com");
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.password_hash).toBeUndefined();

      testUser = response.body.data;
    });

    it("should not register user with existing email", async () => {
      // Mock: existing user found
      query.mockResolvedValueOnce({
        rows: [
          {
            user_id: "existing-user",
            email: "test1@integration.com",
          },
        ],
      });

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test1@integration.com",
          password: "AnotherPass123!",
          firstName: "Another",
          lastName: "User",
          role: "instructor",
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already registered");
    });

    it("should validate email format", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "invalid-email",
          password: "StrongPass123!",
          firstName: "Test",
          lastName: "User",
          role: "student",
        })
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it("should validate password strength", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test2@integration.com",
          password: "weak",
          firstName: "Test",
          lastName: "User",
          role: "student",
        })
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("StrongPass123!", 4);

      // Mock: find user by email
      query.mockResolvedValueOnce({
        rows: [
          {
            user_id: "user-123",
            email: "test1@integration.com",
            password_hash: hashedPassword,
            role: "student",
            first_name: "Test",
            last_name: "User",
            avatar_url: null,
            is_email_verified: false,
            created_at: new Date(),
          },
        ],
      });

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test1@integration.com",
          password: "StrongPass123!",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe("test1@integration.com");
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it("should not login with invalid password", async () => {
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("StrongPass123!", 4);

      // Mock: find user by email
      query.mockResolvedValueOnce({
        rows: [
          {
            user_id: "user-123",
            email: "test1@integration.com",
            password_hash: hashedPassword,
            role: "student",
          },
        ],
      });

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test1@integration.com",
          password: "WrongPassword123!",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it("should not login with non-existent email", async () => {
      // Mock: no user found
      query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@integration.com",
          password: "StrongPass123!",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it("should return 422 for missing credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({})
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should refresh access token with valid refresh token", async () => {
      // First register to get a refresh token
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({
        rows: [
          {
            user_id: "user-123",
            email: "refresh@integration.com",
            role: "student",
            first_name: "Test",
            last_name: "User",
            avatar_url: null,
            is_email_verified: false,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });
      query.mockResolvedValueOnce({ rows: [] });

      const registerRes = await request(app)
        .post("/api/auth/register")
        .send({
          email: "refresh@integration.com",
          password: "StrongPass123!",
          firstName: "Test",
          lastName: "User",
        });

      const refreshToken = registerRes.body.data.refreshToken;

      // Mock: getCache returns cached token data (token exists in Redis)
      getCache.mockResolvedValueOnce({
        userId: "user-123",
        email: "refresh@integration.com",
        createdAt: new Date().toISOString(),
      });

      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.accessToken).not.toBe(
        registerRes.body.data.accessToken,
      );
    });

    it("should not refresh with invalid token", async () => {
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "invalid.token.here" })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Protected Routes", () => {
    it("should access protected route with valid token", async () => {
      const { generateAccessToken } = require("../../src/utils/jwt.util");
      const token = generateAccessToken({
        userId: "user-123",
        email: "test1@integration.com",
        role: "student",
      });

      // Mock: find user by id
      query.mockResolvedValueOnce({
        rows: [
          {
            user_id: "user-123",
            email: "test1@integration.com",
            role: "student",
            first_name: "Test",
            last_name: "User",
            avatar_url: null,
            is_email_verified: false,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe("test1@integration.com");
    });

    it("should not access protected route without token", async () => {
      const response = await request(app)
        .get("/api/auth/profile")
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it("should not access protected route with invalid token", async () => {
      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", "Bearer invalid.token.here")
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
