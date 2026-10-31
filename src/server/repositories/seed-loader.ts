import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { eventRepository } from "./in-memory/in-memory-event.repository.js";
import { vendorRepository } from "./in-memory/in-memory-vendor.repository.js";
import type { FullEventPlan, VendorPlace, DemoUser } from "../../shared/types/index.js";
import { logger } from "../utils/logger.js";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = fs.existsSync(path.resolve(process.cwd(), "data"))
  ? process.cwd()
  : path.resolve(__dirname, "../../..");
const rootDataDir = path.resolve(projectRoot, "data");
const rootTemplatesDir = path.resolve(projectRoot, "templates");

let cachedSeedEvents: FullEventPlan[] = [];
let cachedSeedVendors: VendorPlace[] = [];
let cachedDemoUsers: DemoUser[] = [];

/**
 * Validation schemas for seed data
 */
const SeedEventSchema = z.object({
  id: z.string().min(1),
  profile: z.object({
    type: z.enum(['wedding', 'birthday', 'community', 'general']),
    title: z.string().min(1).max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    city: z.string().min(1).max(200),
    guest_count: z.number().int().min(1).max(100000),
    total_budget: z.number().min(0).max(1000000000),
    currency: z.string().length(3).default('INR'),
  }).passthrough(), // Allow additional fields in profile
  owner_id: z.string().min(1),
  members: z.array(z.any()).optional().default([]),
  timeline: z.any().optional(),
  budget: z.any().optional(),
  vendors: z.any().optional(),
  invitations: z.any().optional(),
  ideas: z.any().optional(),
  risks: z.any().optional(),
  comments: z.any().optional(),
  notifications: z.any().optional(),
}).passthrough(); // Allow additional top-level fields

const SeedVendorSchema = z.object({
  place_id: z.string().min(1),
  name: z.string().min(1).max(200),
  category: z.string().max(200).optional(),
  city: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  rating: z.number().min(0).max(5).optional(),
  price_level: z.number().int().min(1).max(4).optional(),
  phone: z.string().max(50).optional(),
  website: z.string().max(2000).optional(),
}).passthrough();

const SeedDemoUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  role: z.enum(['owner', 'editor', 'viewer']),
}).passthrough();

/**
 * Loads and caches seed data from /data/seed/*.json with validation
 */
export async function initializeSeedData(): Promise<void> {
  try {
    const eventsPath = path.join(rootDataDir, "seed", "events.json");
    const vendorsPath = path.join(rootDataDir, "seed", "vendors.json");
    const usersPath = path.join(rootDataDir, "seed", "demo_users.json");

    if (fs.existsSync(eventsPath)) {
      const rawEvents = JSON.parse(fs.readFileSync(eventsPath, "utf-8"));
      const eventsArray = Array.isArray(rawEvents) ? rawEvents : [rawEvents];
      
      // Validate each event
      const validatedEvents: FullEventPlan[] = [];
      for (const event of eventsArray) {
        try {
          const validated = SeedEventSchema.parse(event);
          validatedEvents.push(validated as unknown as FullEventPlan);
        } catch (err) {
          logger.warn(`Skipping invalid seed event ${event.id}: ${err instanceof Error ? err.message : 'validation failed'}`);
        }
      }
      
      cachedSeedEvents = validatedEvents;
      await eventRepository.resetToSeed(cachedSeedEvents);
      logger.info(`Loaded ${cachedSeedEvents.length} seed events into in-memory store`);
    }

    if (fs.existsSync(vendorsPath)) {
      const rawVendors = JSON.parse(fs.readFileSync(vendorsPath, "utf-8"));
      const vendorsArray = Array.isArray(rawVendors) ? rawVendors : [rawVendors];
      
      // Validate each vendor
      const validatedVendors: VendorPlace[] = [];
      for (const vendor of vendorsArray) {
        try {
          const validated = SeedVendorSchema.parse(vendor);
          validatedVendors.push(validated as unknown as VendorPlace);
        } catch (err) {
          logger.warn(`Skipping invalid seed vendor ${vendor.place_id}: ${err instanceof Error ? err.message : 'validation failed'}`);
        }
      }
      
      cachedSeedVendors = validatedVendors;
      await vendorRepository.resetToSeed(cachedSeedVendors);
      logger.info(`Loaded ${cachedSeedVendors.length} seed vendors into in-memory store`);
    }

    if (fs.existsSync(usersPath)) {
      const rawUsers = JSON.parse(fs.readFileSync(usersPath, "utf-8"));
      const usersArray = Array.isArray(rawUsers) ? rawUsers : [rawUsers];
      
      // Validate each user
      const validatedUsers: DemoUser[] = [];
      for (const user of usersArray) {
        try {
          const validated = SeedDemoUserSchema.parse(user);
          validatedUsers.push(validated as unknown as DemoUser);
        } catch (err) {
          logger.warn(`Skipping invalid demo user ${user.id}: ${err instanceof Error ? err.message : 'validation failed'}`);
        }
      }
      
      cachedDemoUsers = validatedUsers;
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
  const templatePath = path.join(rootTemplatesDir, `${safeType}.json`);
  try {
    return JSON.parse(fs.readFileSync(templatePath, "utf-8"));
  } catch {
    const fallbackPath = path.join(rootTemplatesDir, "wedding.json");
    return JSON.parse(fs.readFileSync(fallbackPath, "utf-8"));
  }
}
