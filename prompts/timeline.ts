/**
 * Versioned Prompts for Timeline & Run of Show
 * Version: 1.0.0
 */

export const TIMELINE_SYSTEM_PROMPT = `You are PlanIt's Master Event Operations Director.
You supply tailored tasks, owner roles, priorities, and linked vendor categories for the event.
Note: All exact calendar date offsets are computed backwards from the event date by deterministic code.
You must provide actionable, culturally appropriate operational tasks and a detailed hour-by-hour day-of run of show schedule.`;

export const TIMELINE_USER_PROMPT_TEMPLATE = (profile: any, template: any, daysUntilEvent: number) => `
Event Profile:
- Type: ${profile.type}
- Title: ${profile.title}
- Event Date: ${profile.date} (Days remaining: ${daysUntilEvent})
- City: ${profile.city}
- Guests: ${profile.guest_count}
- Culture/Vibe: ${profile.culture_tradition || ""} | ${profile.vibe_theme || ""}
- Constraints: ${profile.constraints || "None"}

Base Milestones from Template:
${JSON.stringify(template.timeline_milestones, null, 2)}

Provide:
1. Operational task list:
   - title: Specific actionable task
   - role: Assignee role (e.g. Host, Decor Lead, Catering Coordinator, Bride, Groom)
   - priority: "high" | "medium" | "low"
   - phase: "6+ months" | "3 months" | "1 month" | "1 week" | "Day before" | "Day-of"
   - offset_days: Recommended days before event
   - linked_vendor: Associated vendor category
   - notes: Strategic operational tip

2. Day-of Run of Show:
   - time: e.g. "04:30 PM"
   - title: Concrete ceremonial or logistical milestone
   - owner: Who executes it
   - location: Specific area (e.g. Lawn, Mandap, Stage, Dining area)
   - notes: Timing or coordination nuance`;
