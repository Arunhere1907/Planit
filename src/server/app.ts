import express, { Express } from 'express';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import apiRouter from './routes/index.js';
import { demoUserMiddleware } from './middleware/demo-user.js';
import {
  helmetMiddleware,
  corsMiddleware,
  securityHeadersMiddleware,
  timeoutMiddleware,
} from './middleware/security.js';
import { standardRateLimiter } from './middleware/rate-limit.js';
import { errorHandler } from './middleware/error-handler.js';
import { env } from './config/env.js';

export async function createApp(): Promise<Express> {
  const app = express();

  // Disable X-Powered-By header
  app.disable('x-powered-by');

  // Trust proxy (for rate limiting behind reverse proxies)
  app.set('trust proxy', 1);

  // Enable gzip compression for all responses
  app.use(compression({
    level: 6, // Balance between speed and compression ratio
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
      // Don't compress if client doesn't accept encoding
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // Security middleware (helmet, CORS, CSP, etc.)
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(securityHeadersMiddleware);
  app.use(timeoutMiddleware(30000)); // 30 second timeout

  // Core parsing middleware with size limits
  app.use(express.json({ limit: '1mb' })); // Reduced from 5mb for security
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Rate limiting on API routes
  app.use('/api', standardRateLimiter());

  // Demo user middleware (after rate limiting)
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
