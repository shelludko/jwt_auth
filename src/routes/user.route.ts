import express from 'express';
import {
  getAllUsers,
  getMe,
} from '../controllers/user.controller';
import { deserializeUser } from '../middleware/deserializeUser';
import { requireUser } from '../middleware/requireUser';
import { restrictTo } from '../middleware/restrictTo';

const router = express.Router();

router.use(deserializeUser, requireUser);

// Маршрут получения всех пользователей для админа
router.get('/', restrictTo('admin'), getAllUsers);

// Маршрут получения себя любимого
router.get('/me', getMe);

export default router;
