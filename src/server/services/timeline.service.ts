import { eventRepository } from '../repositories/index.js';
import { TimelineTask, TaskStatus, ActivityLogEntry } from '../../shared/types/index.js';
import { NotFoundError } from '../errors/app-error.js';

export class TimelineService {
  public async getTimeline(eventId: string): Promise<TimelineTask[]> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');
    return event.timeline;
  }

  public async updateTaskStatus(
    eventId: string,
    taskId: string,
    status: TaskStatus,
    user: { id: string; name: string }
  ): Promise<TimelineTask> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');

    const task = event.timeline.find(t => t.id === taskId);
    if (!task) throw new NotFoundError(`Task "${taskId}" not found`);

    task.status = status;

    const activity: ActivityLogEntry = {
      id: `act_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      action: 'completed_task',
      details: `Marked task "${task.title}" as ${status}`,
      timestamp: new Date().toISOString()
    };

    await eventRepository.update(eventId, {
      timeline: event.timeline,
      activityLog: [activity, ...event.activityLog]
    });

    return task;
  }

  public async addTask(
    eventId: string,
    taskData: Omit<TimelineTask, 'id'>,
    user: { id: string; name: string }
  ): Promise<TimelineTask> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');

    const newTask: TimelineTask = {
      ...taskData,
      id: `task_${Date.now()}`
    };

    event.timeline.push(newTask);
    // Keep timeline sorted chronologically
    event.timeline.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const activity: ActivityLogEntry = {
      id: `act_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      action: 'added_task',
      details: `Added new milestone "${newTask.title}" for ${newTask.dueDate}`,
      timestamp: new Date().toISOString()
    };

    await eventRepository.update(eventId, {
      timeline: event.timeline,
      activityLog: [activity, ...event.activityLog]
    });

    return newTask;
  }
}

export const timelineService = new TimelineService();
