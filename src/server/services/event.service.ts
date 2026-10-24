import { eventRepository } from '../repositories/index.js';
import { EventPlan, EventProfile, EventMember, EventComment, ActivityLogEntry } from '../../shared/types/index.js';
import { aiService } from './ai/ai.service.js';
import { NotFoundError } from '../errors/app-error.js';

export class EventService {
  public async getAllEvents(): Promise<EventPlan[]> {
    return eventRepository.findAll();
  }

  public async getEventById(id: string): Promise<EventPlan> {
    const event = await eventRepository.findById(id);
    if (!event) {
      throw new NotFoundError(`Event with id "${id}" not found`);
    }
    return event;
  }

  public async createEventFromProfile(profile: EventProfile, creatorUserId: string): Promise<EventPlan> {
    const budget = aiService.generateDeterministicBudget(profile);
    const timeline = aiService.generateDeterministicTimeline(profile);
    const ideas = await aiService.suggestIdeas(profile);
    const invitations = await aiService.generateInvitations(profile);
    const risks = await aiService.analyzeRisks(profile);

    const initialMember: EventMember = {
      id: `member_${Date.now()}`,
      userId: creatorUserId,
      name: 'Aarav Patel (Organizer)',
      email: 'aarav@planit.demo',
      role: 'owner',
      joinedAt: new Date().toISOString()
    };

    const initialActivity: ActivityLogEntry = {
      id: `act_${Date.now()}`,
      userId: creatorUserId,
      userName: 'Aarav Patel',
      action: 'created_plan',
      details: `Generated plan for ${profile.title} with budget of ${profile.currency} ${profile.totalBudget.toLocaleString()}`,
      timestamp: new Date().toISOString()
    };

    const newPlan: Omit<EventPlan, 'id' | 'createdAt' | 'updatedAt'> = {
      profile,
      budget,
      timeline,
      vendors: [],
      ideas,
      invitations,
      risks,
      members: [initialMember],
      notifications: [],
      comments: [],
      activityLog: [initialActivity]
    };

    return eventRepository.create(newPlan);
  }

  public async updateProfile(eventId: string, patch: Partial<EventProfile>, actingUser: { id: string; name: string }): Promise<EventPlan> {
    const event = await this.getEventById(eventId);
    const updatedProfile: EventProfile = { ...event.profile, ...patch };

    const activity: ActivityLogEntry = {
      id: `act_${Date.now()}`,
      userId: actingUser.id,
      userName: actingUser.name,
      action: 'updated_profile',
      details: 'Updated event profile details',
      timestamp: new Date().toISOString()
    };

    const updated = await eventRepository.update(eventId, {
      profile: updatedProfile,
      activityLog: [activity, ...event.activityLog]
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
      createdAt: new Date().toISOString()
    };

    event.comments.push(newComment);
    await eventRepository.update(eventId, { comments: event.comments });
    return newComment;
  }

  public async addMember(eventId: string, member: Omit<EventMember, 'id' | 'joinedAt'>): Promise<EventMember> {
    const event = await this.getEventById(eventId);
    const newMember: EventMember = {
      ...member,
      id: `mem_${Date.now()}`,
      joinedAt: new Date().toISOString()
    };

    event.members.push(newMember);
    await eventRepository.update(eventId, { members: event.members });
    return newMember;
  }

  public async markNotificationRead(eventId: string, notificationId: string): Promise<void> {
    const event = await this.getEventById(eventId);
    const notif = event.notifications.find(n => n.id === notificationId);
    if (notif) {
      notif.read = true;
      await eventRepository.update(eventId, { notifications: event.notifications });
    }
  }
}

export const eventService = new EventService();
