/**
 * Stripe Configuration
 * Initialize Stripe client
 */

const Stripe = require('stripe');
require('dotenv').config();

// Validate Stripe secret key
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('WARNING: STRIPE_SECRET_KEY not set in environment variables');
}

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key', {
  apiVersion: '2023-10-16', // Use stable API version
  timeout: 10000, // 10 second timeout
  maxNetworkRetries: 2, // Retry failed requests
});

// Webhook secret for signature verification
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

if (!webhookSecret && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: STRIPE_WEBHOOK_SECRET not set - webhook verification will fail');
}

module.exports = {
  stripe,
  webhookSecret,
};
