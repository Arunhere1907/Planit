import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStore } from '../src/server/repositories/in-memory/store.js';
import { InMemoryEventRepository } from '../src/server/repositories/in-memory/in-memory-event.repository.js';
import { InMemoryVendorRepository } from '../src/server/repositories/in-memory/in-memory-vendor.repository.js';
import { FullEventPlan, VendorPlace } from '../src/shared/types/index.js';

describe('In-Memory Data Store & Repositories', () => {
  describe('Generic InMemoryStore', () => {
    it('supports full CRUD cycle and population', () => {
      interface TestItem {
        id: string;
        name: string;
      }
      const store = new InMemoryStore<TestItem>();

      expect(store.count()).toBe(0);

      // Create
      store.set({ id: 'item-1', name: 'Alpha' });
      expect(store.count()).toBe(1);
      expect(store.getById('item-1')?.name).toBe('Alpha');

      // Update
      store.update('item-1', { name: 'Alpha Updated' });
      expect(store.getById('item-1')?.name).toBe('Alpha Updated');

      // Populate
      store.populate([
        { id: 'item-2', name: 'Beta' },
        { id: 'item-3', name: 'Gamma' },
      ]);
      expect(store.count()).toBe(2);
      expect(store.getAll().map((i) => i.id)).toEqual(['item-2', 'item-3']);

      // Delete
      expect(store.delete('item-2')).toBe(true);
      expect(store.count()).toBe(1);
    });
  });

  describe('InMemoryEventRepository', () => {
    let repo: InMemoryEventRepository;

    const samplePlan: FullEventPlan = {
      profile: {
        id: 'test-event-1',
        title: 'Test Wedding',
        type: 'wedding',
        date: '2026-12-18',
        city: 'Ahmedabad',
        guest_count: 200,
        total_budget: 800000,
        currency: 'INR',
        vibe_theme: 'Royal Gujarati',
        culture_tradition: 'Gujarati',
        dietary_mix: 'Pure Veg',
        indoor_outdoor: 'outdoor',
        priorities: ['Feast'],
        constraints: '',
      },
      budget: {
        total_budget: 800000,
        currency: 'INR',
        categories: [],
        expenses: [],
      },
      timeline: {
        tasks: [],
        run_of_show: [],
      },
      vendors: [],
      ideas: [],
      risks: [],
      invitations: [],
      collaborators: [],
      activity_log: [],
    };

    beforeEach(() => {
      repo = new InMemoryEventRepository();
    });

    it('creates, retrieves, and updates an event plan', async () => {
      await repo.create(samplePlan);
      const found = await repo.findById('test-event-1');
      expect(found).not.toBeNull();
      expect(found?.profile.title).toBe('Test Wedding');

      const updated = await repo.update('test-event-1', {
        profile: { ...samplePlan.profile, title: 'Updated Wedding Title' },
      });
      expect(updated.profile.title).toBe('Updated Wedding Title');
    });

    it('resets repository state to seed plans cleanly', async () => {
      await repo.create(samplePlan);
      expect((await repo.findAll()).length).toBe(1);

      await repo.resetToSeed([]);
      expect((await repo.findAll()).length).toBe(0);
    });
  });

  describe('InMemoryVendorRepository', () => {
    let repo: InMemoryVendorRepository;

    const sampleVendors: VendorPlace[] = [
      {
        id: 'v-1',
        name: 'The Green Pearl Resort',
        category: 'Venue & Facilities',
        city: 'Ahmedabad',
        area: 'SG Highway',
        rating: 4.8,
        user_ratings_total: 120,
        price_level: 3,
        approx_cost: 240000,
        address: 'SG Highway, Ahmedabad',
        phone: '+91 98250 11111',
        website: 'https://example.com',
        google_maps_url: 'https://maps.google.com',
        image: '',
        reviews: [],
        highlights: ['Lush Lawn'],
        red_flags: [],
      },
      {
        id: 'v-2',
        name: 'Rasraj Royal Caterers',
        category: 'Catering & Beverages',
        city: 'Ahmedabad',
        area: 'Navrangpura',
        rating: 4.9,
        user_ratings_total: 210,
        price_level: 2,
        approx_cost: 250000,
        address: 'Navrangpura, Ahmedabad',
        phone: '+91 98250 22222',
        website: 'https://example.com',
        google_maps_url: 'https://maps.google.com',
        image: '',
        reviews: [],
        highlights: ['Jain Counters'],
        red_flags: [],
      },
    ];

    beforeEach(async () => {
      repo = new InMemoryVendorRepository();
      await repo.resetToSeed(sampleVendors);
    });

    it('filters vendors by city, category, and minimum rating', async () => {
      const venues = await repo.findPlaces('Venue', 'Ahmedabad', 4.5);
      expect(venues.length).toBe(1);
      expect(venues[0].name).toBe('The Green Pearl Resort');

      const nonExistent = await repo.findPlaces('Venue', 'Delhi');
      expect(nonExistent.length).toBe(0);
    });

    it('searches vendors by keyword query', async () => {
      const results = await repo.searchVendors({ query: 'Rasraj' });
      expect(results.length).toBe(1);
      expect(results[0].category).toBe('Catering & Beverages');
    });
  });
});
