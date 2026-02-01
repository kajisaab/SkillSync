/**
 * Auth API Integration Tests
 * End-to-end tests for authentication endpoints
 */

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

describe("Auth API Endpoints", () => {
  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      // Mock database query for checking existing user (returns empty)
      query.mockResolvedValueOnce({ rows: [] });

      // Mock database query for creating user
      query.mockResolvedValueOnce({
        rows: [
          {
            user_id: "user-123",
            email: "test@example.com",
            role: "student",
            first_name: "John",
            last_name: "Doe",
            avatar_url: null,
            is_email_verified: false,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      // Mock query for setting verification token
      query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        password: "Test@Password123",
        firstName: "John",
        lastName: "Doe",
        role: "student",
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe("test@example.com");
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it("should return 409 if email already exists", async () => {
      // Mock database query for checking existing user (returns user)
      query.mockResolvedValueOnce({
        rows: [
          {
            user_id: "existing-user",
            email: "existing@example.com",
          },
        ],
      });

      const response = await request(app).post("/api/auth/register").send({
        email: "existing@example.com",
        password: "Test@Password123",
        firstName: "Jane",
        lastName: "Doe",
        role: "student",
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already registered");
    });

    it("should return 422 for weak password", async () => {
      const response = await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        password: "weak",
        firstName: "John",
        lastName: "Doe",
      });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });

    it("should return 422 for invalid email", async () => {
      const response = await request(app).post("/api/auth/register").send({
        email: "invalid-email",
        password: "Test@Password123",
        firstName: "John",
        lastName: "Doe",
      });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });

    it("should return 422 for missing required fields", async () => {
      const response = await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        // Missing password, firstName, lastName
      });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("Test@Password123", 12);

      // Mock database query for finding user
      query.mockResolvedValueOnce({
        rows: [
          {
            user_id: "user-123",
            email: "test@example.com",
            password_hash: hashedPassword,
            role: "student",
            first_name: "John",
            last_name: "Doe",
            avatar_url: null,
            is_email_verified: false,
            created_at: new Date(),
          },
        ],
      });

      const response = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "Test@Password123",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe("test@example.com");
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it("should return 401 for invalid email", async () => {
      // Mock database query for finding user (returns empty)
      query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).post("/api/auth/login").send({
        email: "nonexistent@example.com",
        password: "Test@Password123",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid email or password");
    });

    it("should return 401 for invalid password", async () => {
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("CorrectPassword123!", 12);

      // Mock database query for finding user
      query.mockResolvedValueOnce({
        rows: [
          {
            user_id: "user-123",
            email: "test@example.com",
            password_hash: hashedPassword,
            role: "student",
          },
        ],
      });

      const response = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "WrongPassword123!",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should return 422 for missing credentials", async () => {
      const response = await request(app).post("/api/auth/login").send({});

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /health", () => {
    it("should return health check status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.service).toBe("auth-service");
    });
  });

  describe("GET /api/auth/profile", () => {
    it("should return 401 without authentication token", async () => {
      const response = await request(app).get("/api/auth/profile");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should return user profile with valid token", async () => {
      const { generateAccessToken } = require("../../src/utils/jwt.util");
      const token = generateAccessToken({
        userId: "user-123",
        email: "test@example.com",
        role: "student",
      });

      // Mock database query for finding user
      query.mockResolvedValueOnce({
        rows: [
          {
            user_id: "user-123",
            email: "test@example.com",
            role: "student",
            first_name: "John",
            last_name: "Doe",
            avatar_url: null,
            is_email_verified: false,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe("test@example.com");
    });
  });

  describe("404 Handler", () => {
    it("should return 404 for undefined routes", async () => {
      const response = await request(app).get("/api/undefined-route");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
