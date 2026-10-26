import { IEventRepository } from "../interfaces/event.repository.interface.js";
import { FullEventPlan } from "../../../shared/types/index.js";
import { InMemoryStore } from "./store.js";
import { NotFoundError } from "../../errors/app-error.js";

interface EventPlanEntity {
  id: string;
  data: FullEventPlan;
}

export class InMemoryEventRepository implements IEventRepository {
  private store = new InMemoryStore<EventPlanEntity>();

  public async findAll(): Promise<FullEventPlan[]> {
    return this.store.getAll().map((e) => e.data);
  }

  public async findById(id: string): Promise<FullEventPlan | null> {
    const entity = this.store.getById(id);
    return entity ? entity.data : null;
  }

  public async create(plan: FullEventPlan): Promise<FullEventPlan> {
    this.store.set({
      id: plan.profile.id,
      data: plan,
    });
    return plan;
  }

  public async update(id: string, updates: Partial<FullEventPlan>): Promise<FullEventPlan> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError("Event", id);
    }

    // Cap activity log to prevent unbounded growth (keep last 100 entries)
    const MAX_ACTIVITY_LOG_SIZE = 100;
    const activityLog = updates.activity_log || existing.activity_log;
    const cappedActivityLog = activityLog.slice(0, MAX_ACTIVITY_LOG_SIZE);

    const merged: FullEventPlan = {
      ...existing,
      ...updates,
      profile: updates.profile ? { ...existing.profile, ...updates.profile } : existing.profile,
      budget: updates.budget ? { ...existing.budget, ...updates.budget } : existing.budget,
      timeline: updates.timeline ? { ...existing.timeline, ...updates.timeline } : existing.timeline,
      vendors: updates.vendors || existing.vendors,
      ideas: updates.ideas || existing.ideas,
      risks: updates.risks || existing.risks,
      invitations: updates.invitations || existing.invitations,
      collaborators: updates.collaborators || existing.collaborators,
      activity_log: cappedActivityLog,
    };

    this.store.set({
      id,
      data: merged,
    });

    return merged;
  }

  public async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  public async resetToSeed(seedPlans: FullEventPlan[]): Promise<void> {
    this.store.populate(
      seedPlans.map((plan) => ({
        id: plan.profile.id,
        data: plan,
      }))
    );
  }
}

export const eventRepository = new InMemoryEventRepository();
