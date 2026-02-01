/**
 * Auth Validation Schemas
 * Input validation using Joi
 */

const Joi = require("joi");

/**
 * User registration validation schema
 */
const registerSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),

  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters long",
    "any.required": "Password is required",
  }),

  firstName: Joi.string().min(1).max(100).required().trim().messages({
    "string.min": "First name cannot be empty",
    "string.max": "First name must be less than 100 characters",
    "any.required": "First name is required",
  }),

  lastName: Joi.string().min(1).max(100).required().trim().messages({
    "string.min": "Last name cannot be empty",
    "string.max": "Last name must be less than 100 characters",
    "any.required": "Last name is required",
  }),

  role: Joi.string()
    .valid("student", "instructor")
    .default("student")
    .messages({
      "any.only": "Role must be either student or instructor",
    }),

  avatarUrl: Joi.string().uri().optional().allow(null, "").messages({
    "string.uri": "Avatar URL must be a valid URL",
  }),
});

/**
 * User login validation schema
 */
const loginSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),

  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

/**
 * Refresh token validation schema
 */
const refreshSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "any.required": "Refresh token is required",
  }),
});

/**
 * Email verification validation schema
 */
const verifyEmailSchema = Joi.object({
  token: Joi.string().required().messages({
    "any.required": "Verification token is required",
  }),
});

/**
 * Request password reset validation schema
 */
const requestResetSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
});

/**
 * Reset password validation schema
 */
const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    "any.required": "Reset token is required",
  }),

  newPassword: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters long",
    "any.required": "New password is required",
  }),
});

/**
 * Change password validation schema
 */
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "Current password is required",
  }),

  newPassword: Joi.string().min(8).required().messages({
    "string.min": "New password must be at least 8 characters long",
    "any.required": "New password is required",
  }),
});

/**
 * Update profile validation schema
 */
const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).optional().trim().messages({
    "string.min": "First name cannot be empty",
    "string.max": "First name must be less than 100 characters",
  }),

  lastName: Joi.string().min(1).max(100).optional().trim().messages({
    "string.min": "Last name cannot be empty",
    "string.max": "Last name must be less than 100 characters",
  }),

  avatarUrl: Joi.string().uri().optional().allow(null, "").messages({
    "string.uri": "Avatar URL must be a valid URL",
  }),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  verifyEmailSchema,
  requestResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
};
