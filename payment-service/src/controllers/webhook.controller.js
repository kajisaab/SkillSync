/**
 * Webhook Controller
 * Handles Stripe webhook events
 */

const webhookService = require('../services/webhook.service');
const { SuccessResponse } = require('../utils/response.util');

/**
 * Handle Stripe webhook events
 * POST /api/payments/webhook
 *
 * IMPORTANT: This endpoint requires raw body buffer for signature verification
 * Express app must be configured with express.raw() for this route
 */
const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing stripe-signature header',
          code: 'MISSING_SIGNATURE',
        },
      });
    }

    // Verify webhook signature and get event
    const event = webhookService.verifyWebhookSignature(req.body, signature);

    console.log(`Received Stripe webhook: ${event.type} (${event.id})`);

    // Process the webhook event
    const result = await webhookService.processWebhookEvent(event);

    // Stripe expects a 200 response to acknowledge receipt
    return res.status(200).json({
      received: true,
      eventType: result.eventType,
      eventId: result.eventId,
    });
  } catch (error) {
    // Log webhook errors but still return 200 to prevent retries for invalid requests
    console.error('Webhook processing error:', error.message);

    // For signature verification errors, return 400
    if (error.message.includes('signature') || error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
          code: 'WEBHOOK_ERROR',
        },
      });
    }

    // For other errors, return 500 so Stripe will retry
    return res.status(500).json({
      success: false,
      error: {
        message: 'Webhook processing failed',
        code: 'PROCESSING_ERROR',
      },
    });
  }
};

module.exports = {
  handleWebhook,
};
