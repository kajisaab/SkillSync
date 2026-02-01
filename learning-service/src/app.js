/**
 * Express Application
 * Main application configuration and middleware setup
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

const app = express();

// ===== Security Middleware =====
app.use(helmet());

// ===== CORS Configuration =====
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ===== Request Parsing =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== Logging =====
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ===== Health Check (for Docker) =====
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'learning-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// ===== Routes =====
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'SkillSync Learning Service',
    version: '1.0.0',
    status: 'running',
  });
});

// ===== Error Handling =====
// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;
