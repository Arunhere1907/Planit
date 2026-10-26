import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../src/server/app.js';
import { initializeSeedData } from '../src/server/repositories/seed-loader.js';

let appInstance: any = null;

async function getApp() {
  if (!appInstance) {
    await initializeSeedData();
    appInstance = await createApp();
  }
  return appInstance;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  return app(req, res);
}
