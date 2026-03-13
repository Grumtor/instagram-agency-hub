import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { registerSchema, loginSchema, refreshSchema, changePasswordSchema } from '../validators/auth.validator';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, validate(refreshSchema), authController.refreshToken);
router.post('/logout', requireAuth, authController.logout);
router.patch('/password', requireAuth, validate(changePasswordSchema), authController.changePassword);
router.get('/me', requireAuth, authController.getMe);

export default router;
