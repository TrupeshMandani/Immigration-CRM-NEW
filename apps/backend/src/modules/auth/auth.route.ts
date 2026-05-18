import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import * as ctrl from './auth.controller';

export const authRouter = Router();

authRouter.post('/login', ctrl.login);
authRouter.post('/login-link', ctrl.sendLoginLink);
authRouter.post('/firebase-login', ctrl.firebaseLogin);
authRouter.post('/register', ctrl.registerStudent);
authRouter.post('/register-admin', ctrl.registerAdmin);
authRouter.post('/refresh', ctrl.refresh);
authRouter.post('/change-password', authenticateToken, ctrl.changePassword);
authRouter.get('/profile', authenticateToken, ctrl.getProfile);
