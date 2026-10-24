import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { eventRepository } from "./in-memory/in-memory-event.repository.js";
import { vendorRepository } from "./in-memory/in-memory-vendor.repository.js";
import { FullEventPlan, VendorPlace, DemoUser } from "../../shared/types/index.js";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDataDir = path.resolve(__dirname, "../../../data");

let cachedSeedEvents: FullEventPlan[] = [];
let cachedSeedVendors: VendorPlace[] = [];
let cachedDemoUsers: DemoUser[] = [];

/**
 * Loads and caches seed data from /data/seed/*.json
 */
export async function initializeSeedData(): Promise<void> {
  try {
    const eventsPath = path.join(rootDataDir, "seed", "events.json");
    const vendorsPath = path.join(rootDataDir, "seed", "vendors.json");
    const usersPath = path.join(rootDataDir, "seed", "demo_users.json");

    if (fs.existsSync(eventsPath)) {
      cachedSeedEvents = JSON.parse(fs.readFileSync(eventsPath, "utf-8"));
      await eventRepository.resetToSeed(cachedSeedEvents);
      logger.info(`Loaded ${cachedSeedEvents.length} seed events into in-memory store`);
    }

    if (fs.existsSync(vendorsPath)) {
      cachedSeedVendors = JSON.parse(fs.readFileSync(vendorsPath, "utf-8"));
      await vendorRepository.resetToSeed(cachedSeedVendors);
      logger.info(`Loaded ${cachedSeedVendors.length} seed vendors into in-memory store`);
    }

    if (fs.existsSync(usersPath)) {
      cachedDemoUsers = JSON.parse(fs.readFileSync(usersPath, "utf-8"));
      logger.info(`Loaded ${cachedDemoUsers.length} demo users`);
    }
  } catch (error) {
    logger.error("Failed to initialize seed data", error);
  }
}

/**
 * Resets the in-memory store back to initial seed data
 */
export async function resetDatabaseToSeed(): Promise<{ eventsCount: number; vendorsCount: number }> {
  await eventRepository.resetToSeed(cachedSeedEvents);
  await vendorRepository.resetToSeed(cachedSeedVendors);
  logger.info("In-memory database successfully reset to seed data");
  return {
    eventsCount: cachedSeedEvents.length,
    vendorsCount: cachedSeedVendors.length,
  };
}

export function getDemoUsers(): DemoUser[] {
  return cachedDemoUsers;
}

export function loadEventTemplate(type: string): Record<string, unknown> {
  const safeType = ["wedding", "birthday", "community"].includes(type) ? type : "wedding";
  const templatePath = path.join(rootDataDir, "../templates", `${safeType}.json`);
  try {
    return JSON.parse(fs.readFileSync(templatePath, "utf-8"));
  } catch {
    const fallbackPath = path.join(rootDataDir, "../templates", "wedding.json");
    return JSON.parse(fs.readFileSync(fallbackPath, "utf-8"));
  }
}
