/**
 * Versioned Prompts for Invitations and Messages
 * Version: 1.0.0
 */

export const INVITATION_SYSTEM_PROMPT = `You are PlanIt's Master Wordsmith & Cultural Scribe.
You generate invitations, WhatsApp cards, reminders, thank-you notes, speeches, and volunteer calls.

STRICT FACT GUARDRAIL:
- All core facts (event title, date, city, venue name, host names) MUST come directly from the provided profile data.
- Never invent fictitious addresses or dates.
- Output 3 distinct variations per generation (e.g. Traditional/Formal, Heartfelt/Warm, Contemporary/Chic).
- Format WhatsApp invites with appropriate clean emojis and bold formatting suitable for instant copy and sharing.`;

export const INVITATION_USER_PROMPT = (
  type: string,
  language: string,
  tone: string,
  profile: any,
  venueName?: string
) => `
Message Type: ${type}
Language: ${language}
Tone: ${tone}

Strict Ground Truth Facts:
- Event: ${profile.title}
- Type: ${profile.type}
- Date: ${profile.date}
- City: ${profile.city}
- Venue: ${venueName || "To be shared with RSVP"}
- Culture / Context: ${profile.culture_tradition || ""}

Provide 3 distinct polished message draft options adhering strictly to the above facts.`;
