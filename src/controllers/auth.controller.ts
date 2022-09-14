import config from 'config';
import { CookieOptions, NextFunction, Request, Response } from 'express';
import { CreateUserInput, LoginUserInput } from '../schemas/user.schema';
import {
  createUser,
  findUser,
  findUserById,
  signToken,
} from '../services/user.service';
import AppError from '../utils/appError';
import redisClient from '../utils/connectRedis';
import { signJwt, verifyJwt } from '../utils/jwt';

// Исключить эти поля из ответа
export const excludedFields = ['password'];

// Настройка Cookie
const accessTokenCookieOptions: CookieOptions = {
  expires: new Date(
    Date.now() + config.get<number>('accessTokenExpiresIn') * 60 * 1000
  ),
  maxAge: config.get<number>('accessTokenExpiresIn') * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
};

const refreshTokenCookieOptions: CookieOptions = {
  expires: new Date(
    Date.now() + config.get<number>('refreshTokenExpiresIn') * 60 * 1000
  ),
  maxAge: config.get<number>('refreshTokenExpiresIn') * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
};

// Установка значение true для безопасности в продакшене
if (process.env.NODE_ENV === 'production') accessTokenCookieOptions.secure = true;


// Регистрация
export const register = async (
  req: Request<{}, {}, CreateUserInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await createUser({
      email: req.body.email,
      name: req.body.name,
      password: req.body.password,
    });

    res.status(201).json({
      status: 'удачно',
      data: {
        user,
      },
    });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({
        status: 'жопа',
        message: 'Email уже существует',
      });
    }
    next(err);
  }
};


// Авторизация
export const login = async (
  req: Request<{}, {}, LoginUserInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    // Получить пользователя из коллекции
    const user = await findUser({ email: req.body.email });

    // Проверьте, существует ли пользователь и правильный ли пароль
    if (
      !user ||
      !(await user.comparePasswords(user.password, req.body.password))
    ) {
      return next(new AppError('Неверный email или пароль', 401));
    }

    // Создание токенов доступа и обновления
    const { access_token, refresh_token } = await signToken(user);

    // Отправка токена доступа в файле cookie
    res.cookie('access_token', access_token, accessTokenCookieOptions);
    res.cookie('refresh_token', refresh_token, refreshTokenCookieOptions);
    res.cookie('logged_in', true, {
      ...accessTokenCookieOptions,
      httpOnly: false,
    });

    // Отправка токена доступа
    res.status(200).json({
      status: 'удачно',
      access_token,
    });
  } catch (err: any) {
    next(err);
  }
};

// Обновление токена
const updateToken = (res: Response) => {
  res.cookie('access_token', '', { maxAge: 1 });
  res.cookie('refresh_token', '', { maxAge: 1 });
  res.cookie('logged_in', '', { maxAge: 1 });
};

export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Получение обновленного токена из cookie
    const refresh_token = req.cookies.refresh_token as string;

    // Проверка обновленного токена на валидность
    const decoded = verifyJwt<{ sub: string }>(
      refresh_token,
      'refreshTokenPublicKey'
    );
    const message = 'Не удалось обновить токен доступа';
    if (!decoded) {
      return next(new AppError(message, 403));
    }

    // Проверка, есть ли у пользователя действующий сеанс
    const session = await redisClient.get(decoded.sub);
    if (!session) {
      return next(new AppError(message, 403));
    }

    // Проверка, существует ли пользователь
    const user = await findUserById(JSON.parse(session)._id);

    if (!user) {
      return next(new AppError(message, 403));
    }

    // Подписать новый токен доступа
    const access_token = signJwt({ sub: user._id }, 'accessTokenPrivateKey', {
      expiresIn: `${config.get<number>('accessTokenExpiresIn')}m`,
    });

    // Отправить токен доступа как файл cookie
    res.cookie('access_token', access_token, accessTokenCookieOptions);
    res.cookie('logged_in', true, {
      ...accessTokenCookieOptions,
      httpOnly: false,
    });

    // Отправить ответ
    res.status(200).json({
      status: 'удачно',
      access_token,
    });
  } catch (err: any) {
    next(err);
  }
};

// Выход
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    await redisClient.del(user._id);
    updateToken(res);
    return res.status(200).json({ status: 'удачно' });
  } catch (err: any) {
    next(err);
  }
};
