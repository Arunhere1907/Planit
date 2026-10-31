import { eventRepository } from '../../repositories/index.js';
import { mailer } from './mailer.js';
import { logger } from '../../utils/logger.js';
import type { AppNotification, FullEventPlan, Expense } from '../../../shared/types/index.js';

export class InProcessScheduler {
  private timer: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs = 60000; // 1 minute

  public start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.runDueChecks().catch((err: unknown) => {
        logger.error('Error during scheduled task/reminder check', { err });
      });
    }, this.checkIntervalMs);
    this.timer.unref();
    logger.info('In-process reminder scheduler started');
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Scans events, checks task due dates, and dispatches in-app notifications and email previews
   */
  public async runDueChecks(targetEventId?: string): Promise<{ notificationsCreated: number }> {
    const events: FullEventPlan[] = targetEventId
      ? ([await eventRepository.findById(targetEventId)].filter(Boolean) as FullEventPlan[])
      : await eventRepository.findAll();

    let createdCount = 0;
    const now = new Date();

    for (const event of events) {
      if (!event) continue;

      const notifications: AppNotification[] = event.notifications || [];

      for (const task of event.timeline.tasks) {
        if (task.status === 'completed') continue;

        const dueDate = new Date(task.due_date);
        const diffMs = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        // Check if task is overdue or due within 3 days
        if (diffDays <= 3) {
          const isOverdue = diffDays < 0;
          const notificationId = `notif_${event.profile.id}_${task.id}_${isOverdue ? 'overdue' : 'due'}`;

          const existing = notifications.find((n: AppNotification) => n.id === notificationId);
          if (!existing) {
            const notif: AppNotification = {
              id: notificationId,
              eventId: event.profile.id,
              title: isOverdue ? `Overdue Task: ${task.title}` : `Upcoming Deadline: ${task.title}`,
              message: isOverdue
                ? `Task was due on ${task.due_date}. Vendor: ${task.linked_vendor}.`
                : `Task is due in ${diffDays === 0 ? 'today' : `${diffDays} days`} (${task.due_date}).`,
              type: isOverdue ? 'alert' : 'reminder',
              read: false,
              createdAt: new Date().toISOString(),
            };

            notifications.unshift(notif);
            createdCount++;

            // Trigger email notification
            await mailer.sendEmail({
              to: 'host@planit.demo',
              subject: notif.title,
              htmlContent: `<p><strong>${notif.title}</strong></p><p>${notif.message}</p><p>Event: ${event.profile.title}</p>`,
            });
          }
        }
      }

      // Check budget overspending
      const totalSpent = event.budget.expenses.reduce(
        (acc: number, exp: Expense) => acc + exp.amount,
        0
      );
      if (totalSpent > event.budget.total_budget) {
        const notifId = `notif_budget_overspend_${event.profile.id}`;
        if (!notifications.some((n: AppNotification) => n.id === notifId)) {
          notifications.unshift({
            id: notifId,
            eventId: event.profile.id,
            title: 'Budget Alert: Budget Limit Exceeded',
            message: `Total spent (${event.budget.currency} ${totalSpent.toLocaleString()}) has exceeded total allocated budget (${event.budget.currency} ${event.budget.total_budget.toLocaleString()}).`,
            type: 'alert',
            read: false,
            createdAt: new Date().toISOString(),
          });
          createdCount++;
        }
      }

      await eventRepository.update(event.profile.id, { notifications });
    }

    return { notificationsCreated: createdCount };
  }
}

export const inProcessScheduler = new InProcessScheduler();
