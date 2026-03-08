import { Router } from 'express';
import * as instagramController from '../controllers/instagram.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/auth-url', requireAuth, instagramController.getAuthUrl);
router.get('/callback', instagramController.handleCallback);

export default router;
