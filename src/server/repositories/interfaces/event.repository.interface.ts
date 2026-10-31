import type { FullEventPlan } from '../../../shared/types/index.js';

export interface IEventRepository {
  findAll(): Promise<FullEventPlan[]>;
  findById(id: string): Promise<FullEventPlan | null>;
  create(plan: FullEventPlan): Promise<FullEventPlan>;
  update(id: string, updates: Partial<FullEventPlan>): Promise<FullEventPlan>;
  delete(id: string): Promise<boolean>;
  resetToSeed(seedPlans: FullEventPlan[]): Promise<void>;
}
