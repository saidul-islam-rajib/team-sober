import { Injectable, Logger } from '@nestjs/common';
import { isMailConfigured } from './mail.config';
import { MailMessage, MailResult } from './mail.message';
import { smtpSend } from './smtp.client';

const OUTBOX_LIMIT = 50;

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  /** Everything the app has tried to send, newest last. Development aid. */
  private readonly outbox: MailMessage[] = [];

  get configured(): boolean {
    return isMailConfigured();
  }

  recent(limit = 20): MailMessage[] {
    return this.outbox.slice(-limit).reverse();
  }

  async send(message: MailMessage): Promise<MailResult> {
    this.remember(message);

    if (!this.configured) {
      this.logger.warn(
        `SMTP is not configured, so "${message.subject}" for ${message.to} was not sent. ` +
          'Set SMTP_HOST and SMTP_FROM to turn delivery on.',
      );

      return { ok: true, delivered: false, preview: message.text };
    }

    try {
      await smtpSend(message);
      this.logger.log(`Sent "${message.subject}" to ${message.to}`);

      return { ok: true, delivered: true };
    } catch (err) {
      const error =
        err instanceof Error ? err.message : 'Mail delivery failed.';
      this.logger.error(`Could not send to ${message.to}: ${error}`);

      return { ok: false, error };
    }
  }

  private remember(message: MailMessage): void {
    this.outbox.push(message);

    if (this.outbox.length > OUTBOX_LIMIT) this.outbox.shift();
  }
}
