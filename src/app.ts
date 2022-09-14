require('dotenv').config();
import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import config from 'config';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './utils/connectDB';
import userRouter from './routes/user.route';
import authRouter from './routes/auth.route';

const app = express();

// Миддлвары

// Body Parser
app.use(express.json({ limit: '10kb' }));

// Cookie Parser
app.use(cookieParser());

// Cors
app.use(
  cors({
    origin: config.get<string>('origin'),
    credentials: true,
  })
);

// Logger
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Routes
app.use('/users', userRouter);
app.use('/auth', authRouter);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  err.status = err.status || 'error';
  err.statusCode = err.statusCode || 500;

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
});

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json');

app.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument)
);

// Start server
const port = config.get<number>('port');

app.listen(port, () => {
  console.log('----------------------------------');
  console.log(`🚀 Server started on port: ${port} ✅`);
  console.log('----------------------------------');
  // Connect to DB
  connectDB();
});
