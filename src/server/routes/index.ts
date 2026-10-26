import { Router } from 'express';
import eventRoutes from './event.routes.js';
import intakeRoutes from './intake.routes.js';
import budgetRoutes from './budget.routes.js';
import timelineRoutes from './timeline.routes.js';
import vendorRoutes from './vendor.routes.js';
import aiFeaturesRoutes from './ai-features.routes.js';
import generatorRoutes from './generator.routes.js';
import devRoutes from './dev.routes.js';

const apiRouter = Router();

apiRouter.use('/events', eventRoutes);
apiRouter.use('/events', budgetRoutes);
apiRouter.use('/events', timelineRoutes);
apiRouter.use('/events', aiFeaturesRoutes);
apiRouter.use('/intake', intakeRoutes);
apiRouter.use('/vendors', vendorRoutes);
apiRouter.use('/events', vendorRoutes);
apiRouter.use('/', generatorRoutes);

// Dev routes - ONLY available in non-production environments
if (process.env.NODE_ENV !== 'production') {
  apiRouter.use('/dev', devRoutes);
} else {
  // In production, return 404 for dev routes to prevent accidental exposure
  apiRouter.use('/dev', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
  });
}

export default apiRouter;
