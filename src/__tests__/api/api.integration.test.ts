import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../server/app.js';

// Mock Vite to avoid loading it in tests
vi.mock('vite', () => ({
  createServer: vi.fn(() =>
    Promise.resolve({
      middlewares: (_req: any, _res: any, next: any) => next(),
    })
  ),
}));

// Mock services to avoid external dependencies
vi.mock('../../server/services/ai/llm.client.js', () => ({
  llmClient: {
    isAvailable: () => false,
    generateContent: vi.fn(),
  },
}));

vi.mock('../../server/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3000,
    GEMINI_API_KEY: undefined,
    GOOGLE_MAPS_API_KEY: undefined,
  },
}));

vi.mock('../../server/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('API Integration Tests - Event Routes', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/events', () => {
    it('should return list of events', async () => {
      const response = await request(app).get('/api/events').expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return consistent error shape on server error', async () => {
      // This tests error handler middleware
      const response = await request(app)
        .get('/api/events/nonexistent-id-that-causes-error')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('POST /api/events', () => {
    it('should create new event with valid data (happy path)', async () => {
      const newEvent = {
        title: 'Test Wedding',
        type: 'wedding',
        date: '2027-06-15',
        city: 'Mumbai',
        guest_count: 150,
        total_budget: 600000,
        currency: 'INR',
        vibe_theme: 'Traditional',
        culture_tradition: 'Indian',
        dietary_mix: 'Vegetarian',
        indoor_outdoor: 'outdoor',
        priorities: ['food', 'decor'],
        constraints: '',
      };

      const response = await request(app).post('/api/events').send(newEvent).expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.profile.title).toBe('Test Wedding');
      expect(response.body.profile.type).toBe('wedding');
    });

    it('should return 400 for validation error', async () => {
      const invalidEvent = {
        title: '', // Empty title
        guest_count: -10, // Negative guests
        total_budget: -5000, // Negative budget
      };

      const response = await request(app).post('/api/events').send(invalidEvent).expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toMatch(/validation/i);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app).post('/api/events').send({}).expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 403 for viewer role', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('X-Demo-User-Role', 'viewer')
        .send({
          title: 'Test Event',
          city: 'Delhi',
          guest_count: 100,
          total_budget: 500000,
        })
        .expect(403);

      expect(response.body.error.message).toMatch(/permission/i);
    });
  });

  describe('GET /api/events/:id', () => {
    it('should return 404 for non-existent event', async () => {
      const response = await request(app).get('/api/events/nonexistent-id-12345').expect(404);

      expect(response.body.error.message).toMatch(/not found/i);
    });
  });
});

describe('API Integration Tests - Budget Routes', () => {
  let app: Express;
  let eventId: string;

  beforeAll(async () => {
    app = await createApp();

    // Create a test event first
    const response = await request(app).post('/api/events').send({
      title: 'Budget Test Event',
      type: 'wedding',
      date: '2027-01-01',
      city: 'Ahmedabad',
      guest_count: 200,
      total_budget: 800000,
    });

    eventId = response.body.id;
  });

  describe('POST /api/events/:id/budget/expense', () => {
    it('should add expense to budget', async () => {
      const expense = {
        category_name: 'Catering',
        vendor_name: 'ABC Caterers',
        amount: 50000,
        status: 'paid',
        date: '2026-12-01',
      };

      const response = await request(app)
        .post(`/api/events/${eventId}/budget/expense`)
        .send(expense)
        .expect(200);

      expect(response.body.expenses).toBeInstanceOf(Array);
      const addedExpense = response.body.expenses.find(
        (e: any) => e.vendor_name === 'ABC Caterers'
      );
      expect(addedExpense).toBeDefined();
      expect(addedExpense.amount).toBe(50000);
    });

    it('should return 400 for negative expense amount', async () => {
      const response = await request(app)
        .post(`/api/events/${eventId}/budget/expense`)
        .send({
          category_name: 'Venue',
          vendor_name: 'Test',
          amount: -1000,
          status: 'paid',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent event', async () => {
      await request(app)
        .post('/api/events/fake-id/budget/expense')
        .send({
          category_name: 'Venue',
          vendor_name: 'Test',
          amount: 10000,
          status: 'paid',
        })
        .expect(404);
    });
  });

  describe('PATCH /api/events/:id/budget/category/:categoryId', () => {
    it('should update category allocation', async () => {
      const response = await request(app)
        .patch(`/api/events/${eventId}/budget/category/cat-venue`)
        .send({
          amount: 250000,
          is_locked: true,
        })
        .expect(200);

      expect(response.body.categories).toBeInstanceOf(Array);

      // Verify sum still equals total
      const sum = response.body.categories.reduce((acc: number, c: any) => acc + c.amount, 0);
      expect(Math.abs(sum - 800000)).toBeLessThan(10); // Allow small rounding
    });

    it('should return 403 for viewer role', async () => {
      await request(app)
        .patch(`/api/events/${eventId}/budget/category/cat-venue`)
        .set('X-Demo-User-Role', 'viewer')
        .send({ amount: 100000, is_locked: false })
        .expect(403);
    });
  });
});

describe('API Integration Tests - Timeline Routes', () => {
  let app: Express;
  let eventId: string;

  beforeAll(async () => {
    app = await createApp();

    const response = await request(app).post('/api/events').send({
      title: 'Timeline Test Event',
      type: 'birthday',
      date: '2027-03-15',
      city: 'Bangalore',
      guest_count: 50,
      total_budget: 200000,
    });

    eventId = response.body.id;
  });

  describe('POST /api/events/:id/timeline/task', () => {
    it('should add task to timeline', async () => {
      const task = {
        title: 'Book DJ',
        due_date: '2027-02-15',
        assignee: 'Event Coordinator',
        priority: 'high',
        linked_vendor: 'Music',
      };

      const response = await request(app)
        .post(`/api/events/${eventId}/timeline/task`)
        .send(task)
        .expect(200);

      expect(response.body.tasks).toBeInstanceOf(Array);
      const addedTask = response.body.tasks.find((t: any) => t.title === 'Book DJ');
      expect(addedTask).toBeDefined();
      expect(addedTask.priority).toBe('high');
    });

    it('should validate task title is required', async () => {
      await request(app)
        .post(`/api/events/${eventId}/timeline/task`)
        .send({
          title: '',
          due_date: '2027-01-01',
        })
        .expect(400);
    });
  });

  describe('PATCH /api/events/:id/timeline/task/:taskId', () => {
    it('should update task status', async () => {
      // First get existing tasks
      const getResponse = await request(app).get(`/api/events/${eventId}`).expect(200);

      const taskId = getResponse.body.timeline.tasks[0]?.id;

      if (taskId) {
        const response = await request(app)
          .patch(`/api/events/${eventId}/timeline/task/${taskId}`)
          .send({
            status: 'completed',
          })
          .expect(200);

        const updatedTask = response.body.tasks.find((t: any) => t.id === taskId);
        expect(updatedTask.status).toBe('completed');
      }
    });

    it('should return 403 for viewer role', async () => {
      await request(app)
        .patch(`/api/events/${eventId}/timeline/task/task-1`)
        .set('X-Demo-User-Role', 'viewer')
        .send({ status: 'completed' })
        .expect(403);
    });
  });
});

describe('API Integration Tests - Vendor Routes', () => {
  let app: Express;
  let eventId: string;

  beforeAll(async () => {
    app = await createApp();

    const response = await request(app).post('/api/events').send({
      title: 'Vendor Test Event',
      type: 'wedding',
      date: '2027-05-20',
      city: 'Jaipur',
      guest_count: 180,
      total_budget: 750000,
    });

    eventId = response.body.id;
  });

  describe('POST /api/events/:id/vendors', () => {
    it('should add vendor to checklist', async () => {
      const vendor = {
        name: 'Royal Caterers',
        category: 'Catering',
        contact: '9876543210',
        quote: 200000,
        status: 'quote_received',
      };

      const response = await request(app)
        .post(`/api/events/${eventId}/vendors`)
        .send(vendor)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      const addedVendor = response.body.find((v: any) => v.name === 'Royal Caterers');
      expect(addedVendor).toBeDefined();
      expect(addedVendor.category).toBe('Catering');
    });

    it('should validate vendor name is required', async () => {
      await request(app)
        .post(`/api/events/${eventId}/vendors`)
        .send({
          name: '',
          category: 'Decor',
        })
        .expect(400);
    });

    it('should reject negative quote', async () => {
      await request(app)
        .post(`/api/events/${eventId}/vendors`)
        .send({
          name: 'Test Vendor',
          category: 'Music',
          quote: -5000,
        })
        .expect(400);
    });
  });

  describe('PATCH /api/events/:id/vendors/:vendorId', () => {
    it('should update vendor status through pipeline', async () => {
      // First add a vendor
      const addResponse = await request(app).post(`/api/events/${eventId}/vendors`).send({
        name: 'Test Photographer',
        category: 'Photography',
        status: 'contacted',
      });

      const vendorId = addResponse.body.find((v: any) => v.name === 'Test Photographer')?.id;

      if (vendorId) {
        const response = await request(app)
          .patch(`/api/events/${eventId}/vendors/${vendorId}`)
          .send({
            status: 'booked',
            advance_paid: 25000,
          })
          .expect(200);

        const updated = response.body.find((v: any) => v.id === vendorId);
        expect(updated.status).toBe('booked');
        expect(updated.advance_paid).toBe(25000);
      }
    });
  });

  describe('GET /api/vendors/search', () => {
    it('should search vendors by category and city', async () => {
      const response = await request(app)
        .get('/api/vendors/search')
        .query({
          category: 'Venue & Facilities',
          city: 'Mumbai',
        })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      // Should return results from local repository since no API key
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('name');
        expect(response.body[0]).toHaveProperty('category');
        expect(response.body[0]).toHaveProperty('rating');
      }
    });

    it('should handle search with query parameter', async () => {
      const response = await request(app)
        .get('/api/vendors/search')
        .query({
          query: 'catering',
          city: 'Delhi',
        })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });
  });
});

describe('API Integration Tests - AI Features Routes', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp();
  });

  describe('POST /api/intake', () => {
    it('should extract event profile from natural language', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          userInput: 'I want to plan a wedding in Mumbai for 150 guests with 6 lakh budget',
        })
        .expect(200);

      expect(response.body).toHaveProperty('profile');
      expect(response.body.profile.type).toBe('wedding');
      expect(response.body.profile.city).toBe('Mumbai');
      expect(response.body.profile.guest_count).toBe(150);
      expect(response.body.profile.total_budget).toBe(600000);
    });

    it('should return follow-up questions', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          userInput: 'Birthday party next month',
        })
        .expect(200);

      expect(response.body).toHaveProperty('followUpQuestions');
      expect(response.body.followUpQuestions).toBeInstanceOf(Array);
    });

    it('should return 400 for missing userInput', async () => {
      await request(app).post('/api/intake').send({}).expect(400);
    });
  });

  describe('POST /api/generate/ideas', () => {
    it('should generate creative ideas', async () => {
      const profile = {
        type: 'birthday',
        city: 'Bangalore',
        guest_count: 50,
        total_budget: 200000,
        vibe_theme: 'Fun',
      };

      const response = await request(app).post('/api/generate/ideas').send({ profile }).expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('category');
    });
  });

  describe('POST /api/generate/invitations', () => {
    it('should generate invitation variants', async () => {
      const profile = {
        type: 'wedding',
        title: 'Grand Wedding',
        date: '2027-06-15',
        city: 'Jaipur',
        guest_count: 200,
      };

      const response = await request(app)
        .post('/api/generate/invitations')
        .send({ profile })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('content');
      expect(response.body[0]).toHaveProperty('tone');
    });
  });

  describe('POST /api/generate/risks', () => {
    it('should analyze event risks', async () => {
      const profile = {
        type: 'community',
        city: 'Ahmedabad',
        date: '2026-12-18',
        indoor_outdoor: 'outdoor',
        guest_count: 500,
      };

      const response = await request(app).post('/api/generate/risks').send({ profile }).expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('severity');
      expect(response.body[0]).toHaveProperty('mitigation');
    });
  });
});

describe('API Integration Tests - Rate Limiting', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp();
  });

  it('should rate limit LLM routes after many requests', async () => {
    // Make many rapid requests
    const requests = Array(15)
      .fill(null)
      .map(() => request(app).post('/api/intake').send({ userInput: 'Test event' }));

    const responses = await Promise.all(requests);

    // Some requests should be rate limited (429)
    const rateLimited = responses.filter((r) => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});

describe('API Integration Tests - Error Response Shape', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp();
  });

  it('should return consistent error shape for 404', async () => {
    const response = await request(app).get('/api/events/nonexistent-123').expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('message');
    expect(response.body.error).toHaveProperty('statusCode');
    expect(response.body.error.statusCode).toBe(404);
  });

  it('should return consistent error shape for 400', async () => {
    const response = await request(app).post('/api/events').send({ invalid: 'data' }).expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('message');
  });

  it('should return consistent error shape for 403', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('X-Demo-User-Role', 'viewer')
      .send({
        title: 'Test',
        city: 'Delhi',
        guest_count: 100,
        total_budget: 500000,
      })
      .expect(403);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toMatch(/permission/i);
  });
});

describe('API Integration Tests - CORS and Security Headers', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp();
  });

  it('should include security headers', async () => {
    const response = await request(app).get('/api/events');

    // Check for security headers
    expect(response.headers).toHaveProperty('x-content-type-options');
    expect(response.headers).toHaveProperty('x-frame-options');
  });

  it('should accept JSON content type', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('Content-Type', 'application/json')
      .send({
        title: 'Test Event',
        city: 'Mumbai',
        guest_count: 100,
        total_budget: 500000,
      });

    expect([200, 201, 400, 403]).toContain(response.status);
  });
});
