import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { getSettings } from '../settings/settings.store';
import { NewsletterPolicy } from '../shared/config/policies';
import { MailerService } from '../shared/mail/mailer.service';
import { subscribeConfirmEmail } from '../shared/mail/mail.templates';
import {
  confirmResultPage,
  subscribeResultPage,
  unsubscribeResultPage,
} from '../views/public/newsletter.pages';
import { NewsletterRoutes } from './newsletter.routes';
import { SubscribersService } from './subscribers.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Controller()
export class NewsletterController {
  constructor(
    private readonly subscribers: SubscribersService,
    private readonly mailer: MailerService,
  ) {}

  private baseUrl(req: Request): string {
    const configured = (getSettings().siteUrl || '').replace(/\/+$/, '');
    if (configured) return configured;

    const forwarded = req.headers['x-forwarded-proto'];
    const proto =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0] ??
      req.protocol ??
      'http';

    return `${proto}://${req.headers.host ?? 'localhost'}`;
  }

  @Post(NewsletterRoutes.subscribe.template)
  @Header('Content-Type', 'text/html')
  async subscribe(
    @Body() body: { email?: string },
    @Req() req: Request,
  ): Promise<string> {
    const email = (body.email ?? '').trim();

    if (!email || !EMAIL_PATTERN.test(email)) {
      return subscribeResultPage({
        ok: false,
        message: 'Enter a valid email address.',
      });
    }

    const outcome = this.subscribers.subscribe(email);

    if (!('alreadyConfirmed' in outcome)) {
      const link = `${this.baseUrl(req)}${NewsletterRoutes.confirm.template}?token=${outcome.token}`;

      await this.mailer.send({
        ...subscribeConfirmEmail({
          link,
          minutes: NewsletterPolicy.confirmLinkMinutes,
        }),
        to: email,
      });
    }

    return subscribeResultPage({
      ok: true,
      message: 'Check your email for a link to confirm your subscription.',
    });
  }

  @Get(NewsletterRoutes.confirm.template)
  @Header('Content-Type', 'text/html')
  confirm(@Query('token') token = ''): string {
    const result = this.subscribers.confirm(token);

    if (!result.ok) {
      return confirmResultPage({
        ok: false,
        message: 'That confirmation link is invalid or has expired.',
      });
    }

    return confirmResultPage({
      ok: true,
      message: "You're subscribed.",
      unsubscribeUrl: `${NewsletterRoutes.unsubscribe.template}?token=${result.unsubscribeToken}`,
    });
  }

  @Get(NewsletterRoutes.unsubscribe.template)
  @Header('Content-Type', 'text/html')
  unsubscribe(@Query('token') token = ''): string {
    const ok = this.subscribers.unsubscribe(token);

    return unsubscribeResultPage({
      ok,
      message: ok
        ? "You're unsubscribed. Sorry to see you go."
        : 'That unsubscribe link is invalid.',
    });
  }
}
