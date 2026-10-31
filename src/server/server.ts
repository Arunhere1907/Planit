import { createApp } from './app.js';
import { env } from './config/env.js';
import { initializeSeedData } from './repositories/seed-loader.js';
import { inProcessScheduler } from './services/notifications/scheduler.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  await initializeSeedData();
  inProcessScheduler.start();

  const app = await createApp();
  app.listen(env.PORT, () => {
    logger.info(
      `PlanIt GenAI Event Planning Assistant server listening on http://localhost:${env.PORT}`
    );
  });
}

bootstrap().catch((err) => {
  logger.error('Fatal error during application startup', { err });
  process.exit(1);
});
