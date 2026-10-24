import express, { Express } from 'express';
import { createServer as createViteServer } from 'vite';
import apiRouter from './routes/index.js';
import { demoUserMiddleware } from './middleware/demo-user.js';
import { securityHeadersMiddleware } from './middleware/security.js';
import { inMemoryRateLimiter } from './middleware/rate-limit.js';
import { errorHandler } from './middleware/error-handler.js';
import { env } from './config/env.js';

export async function createApp(): Promise<Express> {
  const app = express();

  // Core parsing and security middleware
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(securityHeadersMiddleware);
  app.use('/api', inMemoryRateLimiter());
  app.use(demoUserMiddleware);

  // Mount central API router
  app.use('/api', apiRouter);

  // Mount Vite development server middleware in non-production
  if (env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  // Central error handling middleware
  app.use(errorHandler);

  return app;
}
