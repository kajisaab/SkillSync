/**
 * Route Index
 * Combines all route modules
 */

const express = require('express');
const router = express.Router();

const paymentRoutes = require('./payment.routes');
const webhookRoutes = require('./webhook.routes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Payment Service is running',
    timestamp: new Date().toISOString(),
    service: 'payment-service',
  });
});

// Mount route modules
router.use('/payments', paymentRoutes);
router.use('/payments', webhookRoutes);

module.exports = router;
