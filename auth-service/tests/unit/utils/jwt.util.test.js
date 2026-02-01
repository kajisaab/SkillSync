/**
 * JWT Utility Tests
 * Unit tests for JWT token generation and verification
 */

const {
  generateAccessToken,
  verifyAccessToken,
  generateTokenPair,
  decodeToken,
} = require('../../../src/utils/jwt.util');

// Mock Redis
jest.mock('../../../src/config/redis', () => ({
  setCache: jest.fn().mockResolvedValue(undefined),
  getCache: jest.fn().mockResolvedValue({ userId: 'test-user-id' }),
  delCache: jest.fn().mockResolvedValue(undefined),
}));

describe('JWT Utility', () => {
  const mockPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'student',
  };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should include correct payload data', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = decodeToken(token);

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
      expect(decoded.type).toBe('access');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
    });

    it('should throw error for expired token', () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { ...mockPayload, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '1ms', issuer: 'skillsync-auth', audience: 'skillsync-api' }
      );

      // Wait for token to expire
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(() => verifyAccessToken(expiredToken)).toThrow('Access token expired');
          resolve();
        }, 10);
      });
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', async () => {
      const tokens = await generateTokenPair(mockPayload);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.tokenId).toBeDefined();
      expect(tokens.expiresIn).toBeGreaterThan(0);
    });

    it('should generate unique refresh tokens and token IDs', async () => {
      const tokens1 = await generateTokenPair(mockPayload);
      const tokens2 = await generateTokenPair(mockPayload);

      // Refresh tokens contain unique tokenIds (UUIDs), so they're always unique
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
      expect(tokens1.tokenId).not.toBe(tokens2.tokenId);
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = decodeToken(token);

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });
  });
});
