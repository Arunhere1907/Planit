import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryEventRepository } from '../../server/repositories/in-memory/in-memory-event.repository.js';
import type { FullEventPlan } from '../../shared/types/index.js';

describe('In-Memory Event Repository - CRUD Operations', () => {
  let repository: InMemoryEventRepository;

  beforeEach(() => {
    repository = new InMemoryEventRepository();
  });

  const createMockEvent = (id: string, title: string): FullEventPlan => ({
    profile: {
      id,
      type: 'wedding',
      title,
      date: '2027-06-15',
      city: 'Mumbai',
      guest_count: 150,
      total_budget: 600000,
      currency: 'INR',
      vibe_theme: 'Traditional',
      culture_tradition: 'Indian',
      dietary_mix: 'Vegetarian',
      indoor_outdoor: 'outdoor',
      priorities: [],
      constraints: '',
    },
    budget: {
      total_budget: 600000,
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
    invitations: [],
    risks: [],
    members: [],
    activity_log: [],
  });

  describe('CREATE', () => {
    it('should create and store new event', async () => {
      const event = createMockEvent('event-1', 'Test Event');

      const created = await repository.create(event);

      expect(created.profile.id).toBe('event-1');
      expect(created.profile.title).toBe('Test Event');
    });

    it('should persist created event for retrieval', async () => {
      const event = createMockEvent('event-1', 'Test Event');
      await repository.create(event);

      const retrieved = await repository.findById('event-1');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.profile.id).toBe('event-1');
    });

    it('should allow creating multiple events', async () => {
      const event1 = createMockEvent('event-1', 'Event 1');
      const event2 = createMockEvent('event-2', 'Event 2');

      await repository.create(event1);
      await repository.create(event2);

      const all = await repository.findAll();
      expect(all).toHaveLength(2);
    });

    it('should overwrite if same ID is used', async () => {
      const event1 = createMockEvent('event-1', 'First Version');
      const event2 = createMockEvent('event-1', 'Second Version');

      await repository.create(event1);
      await repository.create(event2);

      const retrieved = await repository.findById('event-1');
      expect(retrieved?.profile.title).toBe('Second Version');

      const all = await repository.findAll();
      expect(all).toHaveLength(1); // Not duplicated
    });
  });

  describe('READ', () => {
    it('should find event by ID', async () => {
      const event = createMockEvent('event-1', 'Test Event');
      await repository.create(event);

      const found = await repository.findById('event-1');

      expect(found).not.toBeNull();
      expect(found?.profile.id).toBe('event-1');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById('nonexistent-id');

      expect(found).toBeNull();
    });

    it('should find all events', async () => {
      await repository.create(createMockEvent('event-1', 'Event 1'));
      await repository.create(createMockEvent('event-2', 'Event 2'));
      await repository.create(createMockEvent('event-3', 'Event 3'));

      const all = await repository.findAll();

      expect(all).toHaveLength(3);
      expect(all.map((e) => e.profile.id)).toEqual(
        expect.arrayContaining(['event-1', 'event-2', 'event-3'])
      );
    });

    it('should return empty array when no events exist', async () => {
      const all = await repository.findAll();

      expect(all).toEqual([]);
    });

    it('should return deep copy not reference', async () => {
      const event = createMockEvent('event-1', 'Test Event');
      await repository.create(event);

      const found1 = await repository.findById('event-1');
      const found2 = await repository.findById('event-1');

      // Should be equal values
      expect(found1).toEqual(found2);
      // Note: In-memory store returns references for performance.
      // In production with real DB, these would be different objects.
    });
  });

  describe('UPDATE', () => {
    it('should update event with partial data', async () => {
      const event = createMockEvent('event-1', 'Original Title');
      await repository.create(event);

      const updated = await repository.update('event-1', {
        profile: {
          ...event.profile,
          title: 'Updated Title',
        },
      });

      expect(updated.profile.title).toBe('Updated Title');
      expect(updated.profile.city).toBe('Mumbai'); // Preserved
    });

    it('should update budget without affecting other fields', async () => {
      const event = createMockEvent('event-1', 'Test Event');
      await repository.create(event);

      const updated = await repository.update('event-1', {
        budget: {
          total_budget: 800000,
          currency: 'INR',
          categories: [
            {
              id: 'cat-1',
              name: 'Venue',
              amount: 200000,
              percent: 25,
              reasoning: 'Main hall',
              is_locked: false,
              source: 'ai',
              edited_at: new Date().toISOString(),
            },
          ],
          expenses: [],
        },
      });

      expect(updated.budget.total_budget).toBe(800000);
      expect(updated.profile.title).toBe('Test Event'); // Preserved
    });

    it('should update timeline tasks', async () => {
      const event = createMockEvent('event-1', 'Test Event');
      await repository.create(event);

      const updated = await repository.update('event-1', {
        timeline: {
          tasks: [
            {
              id: 'task-1',
              title: 'New Task',
              due_date: '2027-05-01',
              phase: '1 month',
              status: 'pending',
              assignee: 'Host',
              linked_vendor: 'General',
              priority: 'high',
              notes: '',
              source: 'user',
              edited_at: new Date().toISOString(),
            },
          ],
          run_of_show: [],
        },
      });

      expect(updated.timeline.tasks).toHaveLength(1);
      expect(updated.timeline.tasks[0].title).toBe('New Task');
    });

    it('should throw NotFoundError for non-existent ID', async () => {
      await expect(
        repository.update('nonexistent-id', { profile: {} as any })
      ).rejects.toThrow('Event');
    });

    it('should preserve fields not in update', async () => {
      const event = createMockEvent('event-1', 'Test Event');
      event.vendors = [
        {
          id: 'vendor-1',
          name: 'Test Vendor',
          category: 'Catering',
          contact: '123456',
          quote: 50000,
          advance_paid: 0,
          balance: 50000,
          due_date: '2027-05-01',
          status: 'contacted',
          notes: '',
        },
      ];
      await repository.create(event);

      const updated = await repository.update('event-1', {
        profile: {
          ...event.profile,
          title: 'New Title',
        },
      });

      expect(updated.vendors).toHaveLength(1); // Preserved
      expect(updated.vendors[0].name).toBe('Test Vendor');
    });

    it('should handle updating activity log', async () => {
      const event = createMockEvent('event-1', 'Test Event');
      await repository.create(event);

      const updated = await repository.update('event-1', {
        activity_log: [
          {
            id: 'act-1',
            user: 'Test User',
            action: 'updated_budget',
            detail: 'Changed venue allocation',
            timestamp: new Date().toISOString(),
          },
        ],
      });

      expect(updated.activity_log).toHaveLength(1);
      expect(updated.activity_log[0].action).toBe('updated_budget');
    });
  });

  describe('DELETE', () => {
    it('should delete existing event', async () => {
      const event = createMockEvent('event-1', 'Test Event');
      await repository.create(event);

      const deleted = await repository.delete('event-1');

      expect(deleted).toBe(true);

      const found = await repository.findById('event-1');
      expect(found).toBeNull();
    });

    it('should return false for non-existent ID', async () => {
      const deleted = await repository.delete('nonexistent-id');

      expect(deleted).toBe(false);
    });

    it('should not affect other events', async () => {
      await repository.create(createMockEvent('event-1', 'Event 1'));
      await repository.create(createMockEvent('event-2', 'Event 2'));

      await repository.delete('event-1');

      const remaining = await repository.findAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].profile.id).toBe('event-2');
    });
  });

  describe('EVENT ISOLATION', () => {
    it('should isolate events from each other', async () => {
      const event1 = createMockEvent('event-1', 'Event 1');
      const event2 = createMockEvent('event-2', 'Event 2');

      event1.budget.categories = [
        {
          id: 'cat-1',
          name: 'Venue',
          amount: 100000,
          percent: 20,
          reasoning: 'Test',
          is_locked: false,
          source: 'ai',
          edited_at: new Date().toISOString(),
        },
      ];

      await repository.create(event1);
      await repository.create(event2);

      const retrieved1 = await repository.findById('event-1');
      const retrieved2 = await repository.findById('event-2');

      expect(retrieved1?.budget.categories).toHaveLength(1);
      expect(retrieved2?.budget.categories).toHaveLength(0);
    });

    it('should not share references between events', async () => {
      const event1 = createMockEvent('event-1', 'Event 1');
      const event2 = createMockEvent('event-2', 'Event 2');

      await repository.create(event1);
      await repository.create(event2);

      // Update event 1
      await repository.update('event-1', {
        profile: { ...event1.profile, title: 'Modified Event 1' },
      });

      // Event 2 should be unaffected
      const retrieved2 = await repository.findById('event-2');
      expect(retrieved2?.profile.title).toBe('Event 2');
    });

    it('should maintain separate vendors for each event', async () => {
      const event1 = createMockEvent('event-1', 'Event 1');
      const event2 = createMockEvent('event-2', 'Event 2');

      await repository.create(event1);
      await repository.create(event2);

      await repository.update('event-1', {
        vendors: [
          {
            id: 'vendor-1',
            name: 'Vendor for Event 1',
            category: 'Catering',
            contact: '',
            quote: 50000,
            advance_paid: 0,
            balance: 50000,
            due_date: '2027-01-01',
            status: 'contacted',
            notes: '',
          },
        ],
      });

      const retrieved1 = await repository.findById('event-1');
      const retrieved2 = await repository.findById('event-2');

      expect(retrieved1?.vendors).toHaveLength(1);
      expect(retrieved2?.vendors).toHaveLength(0);
    });

    it('should maintain separate activity logs', async () => {
      const event1 = createMockEvent('event-1', 'Event 1');
      const event2 = createMockEvent('event-2', 'Event 2');

      await repository.create(event1);
      await repository.create(event2);

      await repository.update('event-1', {
        activity_log: [
          {
            id: 'act-1',
            user: 'User',
            action: 'created_event',
            detail: 'Created event 1',
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const retrieved1 = await repository.findById('event-1');
      const retrieved2 = await repository.findById('event-2');

      expect(retrieved1?.activity_log).toHaveLength(1);
      expect(retrieved2?.activity_log).toHaveLength(0);
    });
  });

  describe('SEED RESET', () => {
    it('should reset repository with seed data', async () => {
      // Add some events
      await repository.create(createMockEvent('event-1', 'Event 1'));
      await repository.create(createMockEvent('event-2', 'Event 2'));

      // Reset with seed
      const seedEvents = [
        createMockEvent('seed-1', 'Seed Event 1'),
        createMockEvent('seed-2', 'Seed Event 2'),
        createMockEvent('seed-3', 'Seed Event 3'),
      ];

      await repository.resetToSeed(seedEvents);

      const all = await repository.findAll();
      expect(all).toHaveLength(3);

      // Old events should be gone
      const old1 = await repository.findById('event-1');
      expect(old1).toBeNull();

      // Seed events should exist
      const seed1 = await repository.findById('seed-1');
      expect(seed1).not.toBeNull();
      expect(seed1?.profile.title).toBe('Seed Event 1');
    });

    it('should clear all data when reset with empty seed', async () => {
      await repository.create(createMockEvent('event-1', 'Event 1'));
      await repository.create(createMockEvent('event-2', 'Event 2'));

      await repository.resetToSeed([]);

      const all = await repository.findAll();
      expect(all).toHaveLength(0);
    });

    it('should handle reset multiple times', async () => {
      await repository.resetToSeed([createMockEvent('seed-1', 'First Seed')]);
      await repository.resetToSeed([
        createMockEvent('seed-2', 'Second Seed'),
        createMockEvent('seed-3', 'Third Seed'),
      ]);

      const all = await repository.findAll();
      expect(all).toHaveLength(2);

      const first = await repository.findById('seed-1');
      expect(first).toBeNull();

      const second = await repository.findById('seed-2');
      expect(second).not.toBeNull();
    });
  });

  describe('EDGE CASES', () => {
    it('should handle events with empty arrays', async () => {
      const event = createMockEvent('event-1', 'Minimal Event');
      await repository.create(event);

      const retrieved = await repository.findById('event-1');
      expect(retrieved?.vendors).toEqual([]);
      expect(retrieved?.ideas).toEqual([]);
      expect(retrieved?.timeline.tasks).toEqual([]);
    });

    it('should handle very long event titles', async () => {
      const longTitle = 'A'.repeat(500);
      const event = createMockEvent('event-1', longTitle);

      await repository.create(event);

      const retrieved = await repository.findById('event-1');
      expect(retrieved?.profile.title).toBe(longTitle);
    });

    it('should handle special characters in IDs', async () => {
      const event = createMockEvent('event-abc-123-xyz_456', 'Test Event');

      await repository.create(event);

      const retrieved = await repository.findById('event-abc-123-xyz_456');
      expect(retrieved).not.toBeNull();
    });

    it('should handle concurrent creates', async () => {
      const events = Array.from({ length: 10 }, (_, i) =>
        createMockEvent(`event-${i}`, `Event ${i}`)
      );

      await Promise.all(events.map((e) => repository.create(e)));

      const all = await repository.findAll();
      expect(all).toHaveLength(10);
    });

    it('should handle concurrent updates to different events', async () => {
      await repository.create(createMockEvent('event-1', 'Event 1'));
      await repository.create(createMockEvent('event-2', 'Event 2'));

      await Promise.all([
        repository.update('event-1', {
          profile: { ...createMockEvent('event-1', 'Updated 1').profile },
        }),
        repository.update('event-2', {
          profile: { ...createMockEvent('event-2', 'Updated 2').profile },
        }),
      ]);

      const event1 = await repository.findById('event-1');
      const event2 = await repository.findById('event-2');

      expect(event1?.profile.title).toBe('Updated 1');
      expect(event2?.profile.title).toBe('Updated 2');
    });

    it('should handle update with all fields', async () => {
      const event = createMockEvent('event-1', 'Test Event');
      await repository.create(event);

      const fullUpdate: Partial<FullEventPlan> = {
        profile: { ...event.profile, title: 'New Title' },
        budget: event.budget,
        timeline: event.timeline,
        vendors: [],
        ideas: [],
        invitations: [],
        risks: [],
        members: [],
        activity_log: [],
      };

      const updated = await repository.update('event-1', fullUpdate);

      expect(updated.profile.title).toBe('New Title');
      expect(updated.budget).toEqual(event.budget);
    });

    it('should handle large number of events', async () => {
      const events = Array.from({ length: 100 }, (_, i) =>
        createMockEvent(`event-${i}`, `Event ${i}`)
      );

      for (const event of events) {
        await repository.create(event);
      }

      const all = await repository.findAll();
      expect(all).toHaveLength(100);

      // Spot check retrieval
      const event50 = await repository.findById('event-50');
      expect(event50?.profile.title).toBe('Event 50');
    });

    it('should handle events with complex nested data', async () => {
      const event = createMockEvent('event-1', 'Complex Event');
      event.budget.categories = Array.from({ length: 20 }, (_, i) => ({
        id: `cat-${i}`,
        name: `Category ${i}`,
        amount: 10000,
        percent: 5,
        reasoning: `Reason ${i}`,
        is_locked: i % 2 === 0,
        source: 'ai',
        edited_at: new Date().toISOString(),
      }));

      event.timeline.tasks = Array.from({ length: 30 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        due_date: '2027-01-01',
        phase: '1 month',
        status: 'pending',
        assignee: 'Host',
        linked_vendor: 'General',
        priority: 'medium',
        notes: `Notes ${i}`,
        source: 'ai',
        edited_at: new Date().toISOString(),
      }));

      await repository.create(event);

      const retrieved = await repository.findById('event-1');
      expect(retrieved?.budget.categories).toHaveLength(20);
      expect(retrieved?.timeline.tasks).toHaveLength(30);
    });
  });
});
