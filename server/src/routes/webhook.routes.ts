import { Router } from 'express';
import * as webhookController from '../controllers/webhook.controller';

const router = Router();

router.get('/instagram', webhookController.verifyWebhook);
router.post('/instagram', webhookController.handleWebhook);

export default router;
