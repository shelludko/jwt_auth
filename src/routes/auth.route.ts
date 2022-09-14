import express from 'express';
import {
  login,
  logout,
  refreshAccessToken,
  register,
} from '../controllers/auth.controller';
import { deserializeUser } from '../middleware/deserializeUser';
import { requireUser } from '../middleware/requireUser';
import { validate } from '../middleware/validate';
import { createUserSchema, loginUserSchema } from '../schemas/user.schema';

const router = express.Router();

// Маршрут регистрации
router.post('/register', validate(createUserSchema), register);

// Маршрут авторизации
router.post('/login', validate(loginUserSchema), login);

// Маршрут обновления токена
router.get('/refresh', refreshAccessToken);

router.use(deserializeUser, requireUser);

// Маршрут выхода
router.get('/logout', logout);

export default router;
