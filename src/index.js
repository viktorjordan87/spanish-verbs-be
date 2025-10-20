import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/env.js';
import { connectToDatabase } from './config/db.js';
import verbsRoutes from './routes/verbs.routes.js';

async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(verbsRoutes);

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const status = error.statusCode || 500;
    reply.code(status).send({ message: error.message || 'Internal Server Error' });
  });

  return app;
}

async function start() {
  try {
    await connectToDatabase(config.mongoUri);
    const app = await buildServer();
    await app.listen({ port: config.port, host: '127.0.0.1' });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  start();
}

export default buildServer;

