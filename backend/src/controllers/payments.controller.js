import Stripe from 'stripe';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Order, OrderItem, User } from '../models/index.js';
import { getSettingsRow, getStripeWebhookSecret, getStripeClient } from '../utils/stripe.js';
import { sendOrderStatusEmail } from '../utils/emails.js';

export const getPublishableKey = asyncHandler(async (req, res) => {
  const row = await getSettingsRow();
  res.json({ data: { publishableKey: row.stripePublishableKey ?? null } });
});

export const stripeWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = await getStripeWebhookSecret();
  const stripe = await getStripeClient();

  if (!stripe || !webhookSecret || !signature) {
    return res.status(400).send('Webhook not configured');
  }

  let event;
  try {
    event = Stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    return res.status(400).send(`Webhook signature verification failed: ${error.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;

    const order = await Order.findOne({
      where: { stripePaymentIntentId: intent.id, status: 'pending' },
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'user', attributes: ['id', 'email'] },
      ],
    });

    if (order) {
      order.status = 'paid';
      await order.save();

      if (order.user?.email) {
        sendOrderStatusEmail({ to: order.user.email, order, status: 'paid' }).catch((error) => {
          console.error('[emails] Payment-confirmed email failed for', order.orderNumber, error.message);
        });
      }
    }
  }

  res.json({ received: true });
});
