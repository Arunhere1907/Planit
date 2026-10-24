import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export interface EmailMessage {
  to: string;
  subject: string;
  htmlContent: string;
}

export interface IMailer {
  sendEmail(message: EmailMessage): Promise<{ success: boolean; id?: string }>;
}

export class ConsoleMailer implements IMailer {
  public async sendEmail(message: EmailMessage): Promise<{ success: boolean; id?: string }> {
    const id = `mail_${Date.now()}`;
    logger.info(`[ConsoleMailer] Email simulated to: ${message.to} | Subject: "${message.subject}"`);
    return { success: true, id };
  }
}

export class ResendMailer implements IMailer {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  public async sendEmail(message: EmailMessage): Promise<{ success: boolean; id?: string }> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'PlanIt Event Assistant <notifications@planit.demo>',
          to: message.to,
          subject: message.subject,
          html: message.htmlContent
        })
      });

      if (!response.ok) {
        throw new Error(`Resend error: ${response.status}`);
      }

      const data = await response.json() as { id?: string };
      return { success: true, id: data.id };
    } catch (err) {
      logger.warn('Failed sending email via Resend, falling back to console logger', { err });
      return { success: false };
    }
  }
}

export const mailer: IMailer =
  env.RESEND_API_KEY && env.RESEND_API_KEY !== 'MY_RESEND_API_KEY'
    ? new ResendMailer(env.RESEND_API_KEY)
    : new ConsoleMailer();
