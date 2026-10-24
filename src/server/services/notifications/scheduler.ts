import { eventRepository } from '../../repositories/index.js';
import { mailer } from './mailer.js';
import { logger } from '../../utils/logger.js';
import { AppNotification } from '../../../shared/types/index.js';

export class InProcessScheduler {
  private timer: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs = 60000; // 1 minute in dev

  public start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.runDueChecks().catch(err => {
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
    const events = targetEventId
      ? [await eventRepository.findById(targetEventId)].filter(Boolean)
      : await eventRepository.findAll();

    let createdCount = 0;
    const now = new Date();

    for (const event of events) {
      if (!event) continue;

      for (const task of event.timeline) {
        if (task.status === 'completed') continue;

        const dueDate = new Date(task.dueDate);
        const diffMs = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        // Check if task is overdue or due within 3 days
        if (diffDays <= 3) {
          const isOverdue = diffDays < 0;
          const notificationId = `notif_${event.id}_${task.id}_${isOverdue ? 'overdue' : 'due'}`;
          
          const existing = event.notifications.find(n => n.id === notificationId);
          if (!existing) {
            const notif: AppNotification = {
              id: notificationId,
              eventId: event.id,
              title: isOverdue ? `Overdue Task: ${task.title}` : `Upcoming Deadline: ${task.title}`,
              message: isOverdue
                ? `Task was due on ${task.dueDate}. Category: ${task.category}.`
                : `Task is due in ${diffDays === 0 ? 'today' : `${diffDays} days`} (${task.dueDate}).`,
              type: isOverdue ? 'alert' : 'reminder',
              read: false,
              createdAt: new Date().toISOString()
            };

            event.notifications.unshift(notif);
            createdCount++;

            // Trigger email notification
            await mailer.sendEmail({
              to: 'host@planit.demo',
              subject: notif.title,
              htmlContent: `<p><strong>${notif.title}</strong></p><p>${notif.message}</p><p>Event: ${event.profile.title}</p>`
            });
          }
        }
      }

      // Check budget overspending
      if (event.budget.totalSpent > event.budget.totalBudget) {
        const notifId = `notif_budget_overspend_${event.id}`;
        if (!event.notifications.some(n => n.id === notifId)) {
          event.notifications.unshift({
            id: notifId,
            eventId: event.id,
            title: 'Budget Alert: Budget Limit Exceeded',
            message: `Total spent (${event.budget.currency} ${event.budget.totalSpent.toLocaleString()}) has exceeded total allocated budget (${event.budget.currency} ${event.budget.totalBudget.toLocaleString()}).`,
            type: 'alert',
            read: false,
            createdAt: new Date().toISOString()
          });
          createdCount++;
        }
      }

      await eventRepository.update(event.id, { notifications: event.notifications });
    }

    return { notificationsCreated: createdCount };
  }
}

export const inProcessScheduler = new InProcessScheduler();
