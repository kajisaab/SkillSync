/**
 * Password Utility Tests
 * Unit tests for password hashing and validation
 */

const {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  generateRandomToken,
  hashToken,
  generatePasswordResetToken,
} = require('../../../src/utils/password.util');

describe('Password Utility', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'Test@Password123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // Bcrypt hashes are typically 60 characters
    });

    it('should generate different hashes for same password', async () => {
      const password = 'Test@Password123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Due to different salts
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'Test@Password123';
      const hash = await hashPassword(password);
      const isMatch = await comparePassword(password, hash);

      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'Test@Password123';
      const wrongPassword = 'Wrong@Password456';
      const hash = await hashPassword(password);
      const isMatch = await comparePassword(wrongPassword, hash);

      expect(isMatch).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate a strong password', () => {
      const result = validatePasswordStrength('Strong@Pass123');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Short1!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePasswordStrength('password123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePasswordStrength('PASSWORD123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('Password!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = validatePasswordStrength('Password123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should return multiple errors for weak password', () => {
      const result = validatePasswordStrength('weak');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('generateRandomToken', () => {
    it('should generate a random token', () => {
      const token = generateRandomToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex characters
    });

    it('should generate unique tokens', () => {
      const token1 = generateRandomToken();
      const token2 = generateRandomToken();

      expect(token1).not.toBe(token2);
    });

    it('should generate token with custom length', () => {
      const token = generateRandomToken(16);

      expect(token.length).toBe(32); // 16 bytes = 32 hex characters
    });
  });

  describe('hashToken', () => {
    it('should hash a token', () => {
      const token = 'test-token-123';
      const hash = hashToken(token);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(token);
      expect(hash.length).toBe(64); // SHA-256 hash is 64 hex characters
    });

    it('should generate same hash for same token', () => {
      const token = 'test-token-123';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different tokens', () => {
      const hash1 = hashToken('token1');
      const hash2 = hashToken('token2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate token and hashed token', () => {
      const result = generatePasswordResetToken();

      expect(result.token).toBeDefined();
      expect(result.hashedToken).toBeDefined();
      expect(result.token).not.toBe(result.hashedToken);
      expect(result.token.length).toBe(64);
      expect(result.hashedToken.length).toBe(64);
    });

    it('should generate unique tokens', () => {
      const result1 = generatePasswordResetToken();
      const result2 = generatePasswordResetToken();

      expect(result1.token).not.toBe(result2.token);
      expect(result1.hashedToken).not.toBe(result2.hashedToken);
    });
  });
});
