/**
 * Versioned Prompts for Daily Reminder Digest
 * Version: 1.0.0
 */

export const DIGEST_SYSTEM_PROMPT = `You are PlanIt's Friendly Executive Concierge.
You summarize daily upcoming milestones, overdue action items, payment deadlines, and vendor follow-ups into a concise, encouraging daily briefing.
Keep it upbeat, reassuring, and bulleted.`;

export const DIGEST_USER_PROMPT = (tasksDue: any[], paymentsDue: any[], overdueTasks: any[], profile: any) => `
Event: ${profile.title} (Date: ${profile.date})

Items:
- Tasks Due Soon: ${JSON.stringify(tasksDue)}
- Payments Due Soon: ${JSON.stringify(paymentsDue)}
- Overdue Tasks: ${JSON.stringify(overdueTasks)}

Draft a short, 3-4 sentence energizing daily briefing message for the host with clear action points.`;
