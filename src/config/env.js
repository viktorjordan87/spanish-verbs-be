import dotenv from 'dotenv';

dotenv.config();

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI is not set');
}

if (!process.env.APP_URL) {
  throw new Error('APP_URL is not set');
}

if (!process.env.PORT) {
  throw new Error('PORT is not set');
}

if (!process.env.NODE_ENV) {
  throw new Error('NODE_ENV is not set');
}

export const config = {
  mongoUri: process.env.MONGO_URI,
  port: Number(process.env.PORT),
  nodeEnv: process.env.NODE_ENV,
  appUrl: process.env.APP_URL,
};

