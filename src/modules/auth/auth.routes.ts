import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validator';
import { authenticate } from '../../middleware/auth';
import { loginLimiter } from '../../middleware/rateLimiter';
import {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
} from './auth.validation';

const router = Router();
const authController = new AuthController();

// Public routes
router.post(
  '/register',
  validate(registerValidation),
  authController.register
);

router.post(
  '/login',
  loginLimiter,
  validate(loginValidation),
  authController.login
);

router.post(
  '/refresh',
  validate(refreshTokenValidation),
  authController.refreshToken
);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);

router.post('/logout', authenticate, authController.logout);

export default router;
