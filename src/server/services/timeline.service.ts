import { eventRepository } from '../repositories/index.js';
import { Task, TaskStatus, ActivityLogItem } from '../../shared/types/index.js';
import { NotFoundError } from '../errors/app-error.js';

export class TimelineService {
  public async getTimeline(eventId: string): Promise<Task[]> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');
    return event.timeline.tasks;
  }

  public async updateTaskStatus(
    eventId: string,
    taskId: string,
    status: TaskStatus,
    user: { id: string; name: string }
  ): Promise<Task> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');

    const task = event.timeline.tasks.find((t: Task) => t.id === taskId);
    if (!task) throw new NotFoundError(`Task "${taskId}" not found`);

    task.status = status;
    task.edited_at = new Date().toISOString();

    const activity: ActivityLogItem = {
      id: `act_${Date.now()}`,
      user: user.name,
      action: 'completed_task',
      detail: `Marked task "${task.title}" as ${status}`,
      timestamp: new Date().toISOString(),
    };

    await eventRepository.update(eventId, {
      timeline: event.timeline,
      activity_log: [activity, ...event.activity_log],
    });

    return task;
  }

  public async addTask(
    eventId: string,
    taskData: Omit<Task, 'id'>,
    user: { id: string; name: string }
  ): Promise<Task> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');

    const newTask: Task = {
      ...taskData,
      id: `task_${Date.now()}`,
      edited_at: new Date().toISOString(),
    };

    event.timeline.tasks.push(newTask);
    // Keep timeline sorted chronologically
    event.timeline.tasks.sort(
      (a: Task, b: Task) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

    const activity: ActivityLogItem = {
      id: `act_${Date.now()}`,
      user: user.name,
      action: 'added_task',
      detail: `Added new milestone "${newTask.title}" for ${newTask.due_date}`,
      timestamp: new Date().toISOString(),
    };

    await eventRepository.update(eventId, {
      timeline: event.timeline,
      activity_log: [activity, ...event.activity_log],
    });

    return newTask;
  }
}

export const timelineService = new TimelineService();
