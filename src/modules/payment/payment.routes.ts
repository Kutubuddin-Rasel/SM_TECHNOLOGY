import { Router } from 'express';
import * as webhookController from './payment.webhook';
import express from 'express';

const router = Router();

router.post('/stripe/webhook', express.raw({ type: 'application/json' }), webhookController.stripeWebhook);
router.post('/paypal/webhook', express.json(), webhookController.paypalWebhook);

export default router;
