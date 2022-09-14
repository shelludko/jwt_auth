import { NextFunction, Request, Response } from 'express';
import { findUserById } from '../services/user.service';
import AppError from '../utils/appError';
import redisClient from '../utils/connectRedis';
import { verifyJwt } from '../utils/jwt';

export const deserializeUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Получить токен
    let access_token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      access_token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.access_token) {
      access_token = req.cookies.access_token;
    }

    if (!access_token) {
      return next(new AppError('Вы не авторизованы', 401));
    }

    // Проверка токена на валидность
    const decoded = verifyJwt<{ sub: string }>(
      access_token,
      'accessTokenPublicKey'
    );

    if (!decoded) {
      return next(new AppError(`Неверный токен или пользователь не существует`, 401));
    }

    // Проверка, есть ли у пользователя действующий сеанс
    const session = await redisClient.get(decoded.sub);

    if (!session) {
      return next(new AppError(`Срок действия сеанса пользователя истек`, 401));
    }

    // Проверка, существует ли пользователь
    const user = await findUserById(JSON.parse(session)._id);

    if (!user) {
      return next(new AppError(`Пользователь с таким токеном больше не существует`, 401));
    }

    // Это действительно важно (помогает нам узнать, вошел ли пользователь в систему с других контроллеров).
    // Можно сделать req.user или res.locals.user
    res.locals.user = user;

    next();
  } catch (err: any) {
    next(err);
  }
};
