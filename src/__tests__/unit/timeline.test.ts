import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateBackwardsDueDates,
  generateDefaultTimeline,
} from '../../shared/utils/deterministic-math.js';

describe('Timeline Backwards Date Calculation', () => {
  beforeEach(() => {
    // Set fixed date: 2026-10-25
    vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
  });

  it('should calculate dates backward from event date', () => {
    const eventDate = '2027-06-15'; // ~233 days from fixed date (Oct 25, 2026), no compression
    const tasks = [
      {
        title: 'Book venue',
        role: 'Organizer',
        priority: 'high' as const,
        phase: '6+ months' as const,
        offset_days: 180,
        linked_vendor: 'Venue',
      },
      {
        title: 'Send invitations',
        role: 'Communication',
        priority: 'medium' as const,
        phase: '1 month' as const,
        offset_days: 30,
        linked_vendor: 'Invitations',
      },
    ];

    const result = calculateBackwardsDueDates(eventDate, tasks);

    expect(result).toHaveLength(2);

    // First task: 180 days before 2027-06-15 = 2026-12-17
    expect(result[0].due_date).toBe('2026-12-17');
    expect(result[0].title).toBe('Book venue');

    // Second task: 30 days before 2027-06-15 = 2027-05-16
    expect(result[1].due_date).toBe('2027-05-16');
    expect(result[1].title).toBe('Send invitations');
  });

  it('should compress timeline when event is near', () => {
    const eventDate = '2026-11-15'; // Only 21 days away
    const tasks = [
      {
        title: 'Book venue',
        role: 'Organizer',
        priority: 'high' as const,
        phase: '6+ months' as const,
        offset_days: 180,
        linked_vendor: 'Venue',
      },
    ];

    const result = calculateBackwardsDueDates(eventDate, tasks);

    // Should compress 180 days proportionally to 21 days
    // 180 / 180 * 21 = 21 days offset
    const eventDateObj = new Date(eventDate);
    const dueDate = new Date(result[0].due_date);
    const diffDays = Math.round(
      (eventDateObj.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    expect(diffDays).toBeLessThanOrEqual(21);
    expect(diffDays).toBeGreaterThan(0);
  });

  it('should never schedule task after event date', () => {
    const eventDate = '2026-10-26'; // Tomorrow
    const tasks = [
      {
        title: 'Last minute task',
        role: 'Organizer',
        priority: 'high' as const,
        phase: 'Day-of' as const,
        offset_days: -5, // Invalid negative offset
        linked_vendor: 'General',
      },
    ];

    const result = calculateBackwardsDueDates(eventDate, tasks);

    const eventDateObj = new Date(eventDate);
    const dueDate = new Date(result[0].due_date);

    expect(dueDate.getTime()).toBeLessThanOrEqual(eventDateObj.getTime());
  });

  it('should set correct phase based on offset_days', () => {
    const eventDate = '2027-06-01';
    const tasks = [
      {
        title: 'T1',
        role: 'O',
        priority: 'high' as const,
        phase: '6+ months' as const,
        offset_days: 200,
        linked_vendor: 'V',
      },
      {
        title: 'T2',
        role: 'O',
        priority: 'high' as const,
        phase: '3 months' as const,
        offset_days: 100,
        linked_vendor: 'V',
      },
      {
        title: 'T3',
        role: 'O',
        priority: 'high' as const,
        phase: '1 month' as const,
        offset_days: 40,
        linked_vendor: 'V',
      },
      {
        title: 'T4',
        role: 'O',
        priority: 'high' as const,
        phase: '1 week' as const,
        offset_days: 10,
        linked_vendor: 'V',
      },
      {
        title: 'T5',
        role: 'O',
        priority: 'high' as const,
        phase: 'Day before' as const,
        offset_days: 1,
        linked_vendor: 'V',
      },
      {
        title: 'T6',
        role: 'O',
        priority: 'high' as const,
        phase: 'Day-of' as const,
        offset_days: 0,
        linked_vendor: 'V',
      },
    ];

    const result = calculateBackwardsDueDates(eventDate, tasks);

    expect(result[0].phase).toBe('6+ months'); // 200 >= 180
    expect(result[1].phase).toBe('3 months'); // 100 >= 90
    expect(result[2].phase).toBe('1 month'); // 40 >= 30
    expect(result[3].phase).toBe('1 week'); // 10 >= 7
    expect(result[4].phase).toBe('Day before'); // 1 >= 1
    expect(result[5].phase).toBe('Day-of'); // 0
  });

  it('should handle event date in the past gracefully', () => {
    const eventDate = '2026-10-01'; // 24 days ago
    const tasks = [
      {
        title: 'Task',
        role: 'Organizer',
        priority: 'high' as const,
        phase: '1 week' as const,
        offset_days: 7,
        linked_vendor: 'Vendor',
      },
    ];

    const result = calculateBackwardsDueDates(eventDate, tasks);

    // Should still calculate, but due_date will be in the past
    expect(result).toHaveLength(1);
    expect(result[0].due_date).toBeDefined();
  });

  it('should assign unique IDs to each task', () => {
    const eventDate = '2027-01-01';
    const tasks = [
      {
        title: 'T1',
        role: 'O',
        priority: 'high' as const,
        phase: '1 month' as const,
        offset_days: 30,
        linked_vendor: 'V',
      },
      {
        title: 'T2',
        role: 'O',
        priority: 'high' as const,
        phase: '1 month' as const,
        offset_days: 30,
        linked_vendor: 'V',
      },
    ];

    const result = calculateBackwardsDueDates(eventDate, tasks);

    expect(result[0].id).not.toBe(result[1].id);
    expect(result[0].id).toMatch(/^task-/);
  });

  it('should set status to pending and source to ai', () => {
    const eventDate = '2027-01-01';
    const tasks = [
      {
        title: 'Task',
        role: 'Organizer',
        priority: 'high' as const,
        phase: '1 month' as const,
        offset_days: 30,
        linked_vendor: 'Vendor',
      },
    ];

    const result = calculateBackwardsDueDates(eventDate, tasks);

    expect(result[0].status).toBe('pending');
    expect(result[0].source).toBe('ai');
  });

  it('should preserve task properties (title, role, priority, vendor)', () => {
    const eventDate = '2027-01-01';
    const tasks = [
      {
        title: 'Custom Task',
        role: 'Custom Role',
        priority: 'low' as const,
        phase: '1 month' as const,
        offset_days: 30,
        linked_vendor: 'Custom Vendor',
        notes: 'Important notes',
      },
    ];

    const result = calculateBackwardsDueDates(eventDate, tasks);

    expect(result[0].title).toBe('Custom Task');
    expect(result[0].assignee).toBe('Custom Role');
    expect(result[0].priority).toBe('low');
    expect(result[0].linked_vendor).toBe('Custom Vendor');
    expect(result[0].notes).toBe('Important notes');
  });

  it('should default notes to empty string if not provided', () => {
    const eventDate = '2027-01-01';
    const tasks = [
      {
        title: 'Task',
        role: 'Organizer',
        priority: 'high' as const,
        phase: '1 month' as const,
        offset_days: 30,
        linked_vendor: 'Vendor',
      },
    ];

    const result = calculateBackwardsDueDates(eventDate, tasks);

    expect(result[0].notes).toBe('');
  });

  it('should handle empty linked_vendor by defaulting to General', () => {
    const eventDate = '2027-01-01';
    const tasks = [
      {
        title: 'Task',
        role: 'Organizer',
        priority: 'high' as const,
        phase: '1 month' as const,
        offset_days: 30,
        linked_vendor: '',
      },
    ];

    const result = calculateBackwardsDueDates(eventDate, tasks);

    expect(result[0].linked_vendor).toBe('General');
  });

  it('should guarantee at least 1 day until event', () => {
    const eventDate = '2026-10-25'; // Today
    const tasks = [
      {
        title: 'Task',
        role: 'Organizer',
        priority: 'high' as const,
        phase: 'Day-of' as const,
        offset_days: 30,
        linked_vendor: 'Vendor',
      },
    ];

    const result = calculateBackwardsDueDates(eventDate, tasks);

    // daysUntilEvent will be max(1, calculated)
    expect(result).toHaveLength(1);
  });
});

describe('Generate Default Timeline', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
  });

  it('should generate default wedding timeline with 9 tasks', () => {
    const eventDate = '2027-04-15';

    const result = generateDefaultTimeline(eventDate, 'wedding');

    expect(result).toHaveLength(9);
    expect(result[0].title).toContain('venue');
    expect(result[result.length - 1].title).toContain('Day-of');
  });

  it('should assign tasks to different roles', () => {
    const eventDate = '2027-04-15';

    const result = generateDefaultTimeline(eventDate, 'wedding');

    const roles = result.map((t) => t.assignee);
    const uniqueRoles = new Set(roles);

    expect(uniqueRoles.size).toBeGreaterThan(1); // Multiple roles
  });

  it('should include high priority tasks', () => {
    const eventDate = '2027-04-15';

    const result = generateDefaultTimeline(eventDate, 'wedding');

    const highPriorityTasks = result.filter((t) => t.priority === 'high');
    expect(highPriorityTasks.length).toBeGreaterThan(0);
  });

  it('should link tasks to vendors', () => {
    const eventDate = '2027-04-15';

    const result = generateDefaultTimeline(eventDate, 'wedding');

    const venueTask = result.find((t) => t.title.toLowerCase().includes('venue'));
    expect(venueTask?.linked_vendor).toBe('Venue');

    const cateringTask = result.find((t) => t.title.toLowerCase().includes('catering'));
    expect(cateringTask?.linked_vendor).toBe('Catering');
  });

  it('should span from 180 days to day-of', () => {
    const eventDate = '2027-04-15';

    const result = generateDefaultTimeline(eventDate, 'wedding');

    const eventDateObj = new Date(eventDate);

    // Find earliest and latest tasks
    const dueDates = result.map((t) => new Date(t.due_date));
    const earliest = new Date(Math.min(...dueDates.map((d) => d.getTime())));
    const latest = new Date(Math.max(...dueDates.map((d) => d.getTime())));

    // Earliest should be months before
    const diffEarliest = Math.round(
      (eventDateObj.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffEarliest).toBeGreaterThan(100);

    // Latest should be close to event date
    const diffLatest = Math.round(
      (eventDateObj.getTime() - latest.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffLatest).toBeLessThan(2);
  });

  it('should handle event date as string YYYY-MM-DD', () => {
    const result = generateDefaultTimeline('2027-12-31', 'wedding');

    expect(result).toHaveLength(9);
    result.forEach((task) => {
      expect(task.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('should work regardless of provided event type', () => {
    // Birthday and community use same default template currently
    const resultWedding = generateDefaultTimeline('2027-01-01', 'wedding');
    const resultBirthday = generateDefaultTimeline('2027-01-01', 'birthday');

    expect(resultWedding).toHaveLength(9);
    expect(resultBirthday).toHaveLength(9);
  });
});

describe('Timeline Edge Cases', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
  });

  it('should handle leap year dates correctly', () => {
    const eventDate = '2028-02-29'; // Leap year
    const tasks = [
      {
        title: 'Task',
        role: 'Organizer',
        priority: 'high' as const,
        phase: '1 month' as const,
        offset_days: 30,
        linked_vendor: 'Vendor',
      },
    ];

    const result = calculateBackwardsDueDates(eventDate, tasks);

    expect(result[0].due_date).toBe('2028-01-30');
  });

  it('should handle year boundary crossing', () => {
    const eventDate = '2027-01-15';
    const tasks = [
      {
        title: 'Task',
        role: 'Organizer',
        priority: 'high' as const,
        phase: '1 month' as const,
        offset_days: 30,
        linked_vendor: 'Vendor',
      },
    ];

    const result = calculateBackwardsDueDates(eventDate, tasks);

    // 30 days before 2027-01-15 = 2026-12-16
    expect(result[0].due_date).toBe('2026-12-16');
  });

  it('should handle very large offsets', () => {
    const eventDate = '2030-12-31';
    const tasks = [
      {
        title: 'Very early task',
        role: 'Organizer',
        priority: 'high' as const,
        phase: '6+ months' as const,
        offset_days: 365 * 2, // 2 years
        linked_vendor: 'Vendor',
      },
    ];

    const result = calculateBackwardsDueDates(eventDate, tasks);

    expect(result[0].due_date).toBe('2028-12-31');
    expect(result[0].phase).toBe('6+ months');
  });

  it('should handle multiple tasks with same offset', () => {
    const eventDate = '2027-06-01';
    const tasks = [
      {
        title: 'T1',
        role: 'O',
        priority: 'high' as const,
        phase: '1 month' as const,
        offset_days: 30,
        linked_vendor: 'V1',
      },
      {
        title: 'T2',
        role: 'O',
        priority: 'high' as const,
        phase: '1 month' as const,
        offset_days: 30,
        linked_vendor: 'V2',
      },
      {
        title: 'T3',
        role: 'O',
        priority: 'high' as const,
        phase: '1 month' as const,
        offset_days: 30,
        linked_vendor: 'V3',
      },
    ];

    const result = calculateBackwardsDueDates(eventDate, tasks);

    // All should have same due date
    expect(result[0].due_date).toBe(result[1].due_date);
    expect(result[1].due_date).toBe(result[2].due_date);

    // But different IDs
    expect(result[0].id).not.toBe(result[1].id);
  });

  it('should handle empty tasks array', () => {
    const eventDate = '2027-01-01';
    const tasks: any[] = [];

    const result = calculateBackwardsDueDates(eventDate, tasks);

    expect(result).toEqual([]);
  });
});
