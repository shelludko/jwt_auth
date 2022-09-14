import { object, string, TypeOf } from 'zod';

export const createUserSchema = object({
  body: object({
    name: string({ required_error: 'Укажите имя' }),
    email: string({ required_error: 'Укажите email' }).email(
      'Invalid email'
    ),
    password: string({ required_error: 'Укажите пароль' })
      .min(8, 'Пароль должен быть не меньше 8 символов')
      .max(32, 'Пароль должен быть не больше 32 символов'),
    passwordConfirm: string({ required_error: 'Повторите пароль' }),
  }).refine((data) => data.password === data.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'Пароли не совпадают',
  }),
});

export const loginUserSchema = object({
  body: object({
    email: string({ required_error: 'Email обязателен' }).email(
      'Неверный email или пароль'
    ),
    password: string({ required_error: 'Пароль обязателен' }).min(
      8,
      'Неверный email или пароль'
    ),
  }),
});

export type CreateUserInput = TypeOf<typeof createUserSchema>['body'];
export type LoginUserInput = TypeOf<typeof loginUserSchema>['body'];
