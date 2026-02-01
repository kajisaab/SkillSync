const bcrypt = require('bcryptjs');
const { register, login } = require('../../../src/services/auth.service');
const userRepository = require('../../../src/repositories/user.repository');

// Mock dependencies
jest.mock('../../../src/repositories/user.repository');
jest.mock('../../../src/utils/jwt.util', () => ({
  generateTokenPair: jest.fn().mockResolvedValue({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    tokenId: 'mock-token-id',
    expiresIn: 900,
  }),
  refreshAccessToken: jest.fn(),
  revokeRefreshToken: jest.fn(),
}));
jest.mock('../../../src/config/redis', () => ({
  setCache: jest.fn().mockResolvedValue(undefined),
  getCache: jest.fn().mockResolvedValue(null),
  delCache: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(false),
  connectRedis: jest.fn().mockResolvedValue(undefined),
  closeRedis: jest.fn().mockResolvedValue(undefined),
}));

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const mockUserData = {
      email: 'newuser@example.com',
      password: 'StrongPass123!',
      firstName: 'John',
      lastName: 'Doe',
      role: 'student',
    };

    it('should register a new user successfully', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        user_id: 'user-123',
        email: mockUserData.email,
        role: mockUserData.role,
        first_name: mockUserData.firstName,
        last_name: mockUserData.lastName,
        avatar_url: null,
        is_email_verified: false,
        created_at: new Date(),
      });
      userRepository.setVerificationToken.mockResolvedValue(undefined);

      const result = await register(mockUserData);

      expect(result).toBeDefined();
      expect(result.user.email).toBe(mockUserData.email);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(mockUserData.email);
      expect(userRepository.create).toHaveBeenCalled();
    });

    it('should throw error if email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue({ email: mockUserData.email });

      await expect(register(mockUserData)).rejects.toThrow('Email already registered');
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should hash password before saving', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        user_id: 'user-123',
        email: mockUserData.email,
        role: mockUserData.role,
        first_name: mockUserData.firstName,
        last_name: mockUserData.lastName,
        avatar_url: null,
        is_email_verified: false,
        created_at: new Date(),
      });
      userRepository.setVerificationToken.mockResolvedValue(undefined);

      await register(mockUserData);

      const createCall = userRepository.create.mock.calls[0][0];
      expect(createCall.passwordHash).toBeDefined();
      expect(createCall.passwordHash).not.toBe(mockUserData.password);

      // Verify it's a bcrypt hash
      const isValidHash = await bcrypt.compare(mockUserData.password, createCall.passwordHash);
      expect(isValidHash).toBe(true);
    });
  });

  describe('login', () => {
    const mockEmail = 'user@example.com';
    const mockPassword = 'StrongPass123!';

    it('should login successfully with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash(mockPassword, 4);
      const mockUser = {
        user_id: 'user-123',
        email: mockEmail,
        password_hash: hashedPassword,
        role: 'student',
        first_name: 'John',
        last_name: 'Doe',
        avatar_url: null,
        is_email_verified: false,
        created_at: new Date(),
      };

      userRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await login(mockEmail, mockPassword);

      expect(result).toBeDefined();
      expect(result.user.email).toBe(mockEmail);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw error for non-existent user', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(login(mockEmail, mockPassword)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for incorrect password', async () => {
      const hashedPassword = await bcrypt.hash('DifferentPassword123!', 4);
      const mockUser = {
        user_id: 'user-123',
        email: mockEmail,
        password_hash: hashedPassword,
      };

      userRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(login(mockEmail, mockPassword)).rejects.toThrow('Invalid email or password');
    });
  });
});
