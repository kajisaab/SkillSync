/**
 * JWT Utility Functions
 * Token generation, verification, and refresh logic
 */

const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { setCache, getCache, delCache } = require("../config/redis");

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

// Convert expiry strings to seconds for Redis TTL
const expiryToSeconds = (expiry) => {
  const units = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // Default 15 minutes

  const [, value, unit] = match;
  return parseInt(value) * units[unit];
};

const ACCESS_TTL = expiryToSeconds(ACCESS_TOKEN_EXPIRY);
const REFRESH_TTL = expiryToSeconds(REFRESH_TOKEN_EXPIRY);

/**
 * Generate access token
 * @param {Object} payload - User data to encode
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload) => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  const tokenPayload = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    type: "access",
  };

  return jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: "skillsync-auth",
    audience: "skillsync-api",
  });
};

/**
 * Generate refresh token
 * @param {Object} payload - User data to encode
 * @returns {Promise<Object>} Refresh token and token ID
 */
const generateRefreshToken = async (payload) => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  const tokenId = uuidv4();
  const tokenPayload = {
    userId: payload.userId,
    email: payload.email,
    tokenId,
    type: "refresh",
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: "skillsync-auth",
    audience: "skillsync-api",
  });

  // Store refresh token in Redis for validation
  const cacheKey = `auth:refresh:${tokenId}`;
  await setCache(
    cacheKey,
    {
      userId: payload.userId,
      email: payload.email,
      createdAt: new Date().toISOString(),
    },
    REFRESH_TTL,
  );

  return { token, tokenId };
};

/**
 * Verify access token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "skillsync-auth",
      audience: "skillsync-api",
    });

    if (decoded.type !== "access") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Access token expired");
    }
    if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid access token");
    }
    throw error;
  }
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {Promise<Object>} Decoded token payload
 */
const verifyRefreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "skillsync-auth",
      audience: "skillsync-api",
    });

    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type");
    }

    // Check if token exists in Redis (not revoked)
    const cacheKey = `auth:refresh:${decoded.tokenId}`;
    const cachedToken = await getCache(cacheKey);

    if (!cachedToken) {
      throw new Error("Refresh token revoked or expired");
    }

    return decoded;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Refresh token expired");
    }
    if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid refresh token");
    }
    throw error;
  }
};

/**
 * Revoke refresh token
 * @param {string} tokenId - Refresh token ID
 * @returns {Promise<void>}
 */
const revokeRefreshToken = async (tokenId) => {
  const cacheKey = `auth:refresh:${tokenId}`;
  await delCache(cacheKey);
};

/**
 * Revoke all refresh tokens for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
const revokeAllUserTokens = async (userId) => {
  // This would require storing a user->tokens mapping
  // For now, we rely on token expiration
  // In production, consider using a token blacklist pattern
  console.log(`Revoking all tokens for user: ${userId}`);
};

/**
 * Generate token pair (access + refresh)
 * @param {Object} payload - User data
 * @returns {Promise<Object>} Access token and refresh token
 */
const generateTokenPair = async (payload) => {
  const accessToken = generateAccessToken(payload);
  const { token: refreshToken, tokenId } = await generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    tokenId,
    expiresIn: ACCESS_TTL,
  };
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New access token
 */
const refreshAccessToken = async (refreshToken) => {
  // Verify refresh token
  const decoded = await verifyRefreshToken(refreshToken);

  // Generate new access token
  const accessToken = generateAccessToken({
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
  });

  return {
    accessToken,
    expiresIn: ACCESS_TTL,
  };
};

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  generateTokenPair,
  refreshAccessToken,
  decodeToken,
};
