import { Router } from 'express';
import { login, logout, me, logoutAll, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginLimiter } from '../middleware/rateLimiters.js';
import { loginSchema, changePasswordSchema } from '../validators/auth.js';

const router = Router();
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', protect, me);
router.post('/logout-all', protect, logoutAll);
router.post('/change-password', protect, validate(changePasswordSchema), changePassword);
export default router;
