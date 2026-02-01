/**
 * Webhook Routes
 * Routes for Stripe webhook events
 */

const express = require('express');
const router = express.Router();

const webhookController = require('../controllers/webhook.controller');

/**
 * POST /api/payments/webhook
 * Handle Stripe webhook events
 * @access Public (verified by Stripe signature)
 *
 * IMPORTANT: This route must use raw body buffer
 * The main app.js should configure express.raw() for this specific route
 */
router.post('/webhook', webhookController.handleWebhook);

module.exports = router;
