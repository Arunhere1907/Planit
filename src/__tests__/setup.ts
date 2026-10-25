// @ts-expect-error - expect is used implicitly by vitest matchers
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test case
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = 'test-key';
process.env.GOOGLE_PLACES_API_KEY = 'test-places-key';

// Fixed date for deterministic tests
export const FIXED_DATE = new Date('2026-10-25T12:00:00Z');

// Mock Date for deterministic tests
vi.useFakeTimers();
vi.setSystemTime(FIXED_DATE);
