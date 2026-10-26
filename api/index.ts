import type { IncomingMessage, ServerResponse } from 'http';
import type { Express } from 'express';
import { createApp } from '../src/server/app.js';
import { initializeSeedData } from '../src/server/repositories/seed-loader.js';

let appInstance: Express | null = null;

async function getApp() {
  if (!appInstance) {
    await initializeSeedData();
    appInstance = await createApp();
  }
  return appInstance;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const app = await getApp();
  // Express app acts as a request handler
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
