import { eventRepository } from '../repositories/index.js';
import type {
  FullEventPlan,
  EventProfile,
  Collaborator,
  EventComment,
  ActivityLogItem,
  AppNotification,
} from '../../shared/types/index.js';
import { aiService } from './ai/ai.service.js';
import { NotFoundError } from '../errors/app-error.js';

export class EventService {
  public async getAllEvents(): Promise<FullEventPlan[]> {
    return eventRepository.findAll();
  }

  public async getEventById(id: string): Promise<FullEventPlan> {
    const event = await eventRepository.findById(id);
    if (!event) {
      throw new NotFoundError(`Event with id "${id}" not found`);
    }
    return event;
  }

  public async createEventFromProfile(
    profile: EventProfile,
    creatorUserId: string
  ): Promise<FullEventPlan> {
    const budget = aiService.generateDeterministicBudget(profile);
    const timeline = aiService.generateDeterministicTimeline(profile);
    const ideas = await aiService.suggestIdeas(profile);
    const invitations = await aiService.generateInvitations(profile);
    const risks = await aiService.analyzeRisks(profile);

    const initialMember: Collaborator = {
      id: creatorUserId,
      name: 'Aarav Patel (Organizer)',
      email: 'aarav@planit.demo',
      role: 'owner',
    };

    const initialActivity: ActivityLogItem = {
      id: `act_${Date.now()}`,
      user: 'Aarav Patel',
      action: 'created_plan',
      detail: `Generated plan for ${profile.title} with budget of ${profile.currency} ${profile.total_budget.toLocaleString()}`,
      timestamp: new Date().toISOString(),
    };

    const newPlan: FullEventPlan = {
      profile,
      budget,
      timeline,
      vendors: [],
      ideas,
      invitations,
      risks,
      collaborators: [initialMember],
      notifications: [],
      comments: [],
      activity_log: [initialActivity],
    };

    return eventRepository.create(newPlan);
  }

  public async updateProfile(
    eventId: string,
    patch: Partial<EventProfile>,
    actingUser: { id: string; name: string }
  ): Promise<FullEventPlan> {
    const event = await this.getEventById(eventId);
    const updatedProfile: EventProfile = { ...event.profile, ...patch };

    const activity: ActivityLogItem = {
      id: `act_${Date.now()}`,
      user: actingUser.name,
      action: 'updated_profile',
      detail: 'Updated event profile details',
      timestamp: new Date().toISOString(),
    };

    const updated = await eventRepository.update(eventId, {
      profile: updatedProfile,
      activity_log: [activity, ...event.activity_log],
    });

    if (!updated) throw new NotFoundError('Event not found');
    return updated;
  }

  public async addComment(
    eventId: string,
    commentData: { section: string; targetId?: string; content: string },
    user: { id: string; name: string; avatarUrl?: string }
  ): Promise<EventComment> {
    const event = await this.getEventById(eventId);

    const newComment: EventComment = {
      id: `comment_${Date.now()}`,
      eventId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatarUrl,
      section: commentData.section,
      targetId: commentData.targetId,
      content: commentData.content,
      createdAt: new Date().toISOString(),
    };

    const comments = [...(event.comments || []), newComment];
    await eventRepository.update(eventId, { comments });
    return newComment;
  }

  public async addMember(eventId: string, member: Omit<Collaborator, 'id'>): Promise<Collaborator> {
    const event = await this.getEventById(eventId);
    const newMember: Collaborator = {
      ...member,
      id: `mem_${Date.now()}`,
    };

    const collaborators = [...event.collaborators, newMember];
    await eventRepository.update(eventId, { collaborators });
    return newMember;
  }

  public async markNotificationRead(eventId: string, notificationId: string): Promise<void> {
    const event = await this.getEventById(eventId);
    const notifications = (event.notifications || []).map((n: AppNotification) =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    await eventRepository.update(eventId, { notifications });
  }
}

export const eventService = new EventService();
