import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { connectToDatabase } from './config/db.js';
import verbsRoutes from './routes/verbs.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildServer() {
  const app = Fastify({ logger: true });

  // CORS configuration
  await app.register(cors, {
    origin: config.appUrl,
    credentials: true,
  });
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

  // Serve frontend in production
  if (process.env.NODE_ENV === 'production') {
    // Serve static files for your frontend
    await app.register(fastifyStatic, {
      root: path.resolve(__dirname, '../frontend/dist'),
      prefix: '/',
    });

    // Catch-all route to serve your frontend application
    app.setNotFoundHandler((request, reply) => {
      reply.sendFile('index.html');
    });
  }

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

