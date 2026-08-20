import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { PostsService } from '../posts/posts.service';
import { getSettings } from '../settings/settings.store';
import { MailerService } from '../shared/mail/mailer.service';
import { newsletterIssueEmail } from '../shared/mail/mail.templates';
import { newsletterAdminPage } from '../views/admin/newsletter.page';
import { NewsletterAdminRoutes, NewsletterRoutes } from './newsletter.routes';
import { SubscribersService } from './subscribers.service';

@Controller('admin/newsletter')
@UseGuards(AuthGuard)
export class NewsletterAdminController {
  constructor(
    private readonly subscribers: SubscribersService,
    private readonly mailer: MailerService,
    private readonly posts: PostsService,
  ) {}

  @Get()
  @Header('Content-Type', 'text/html')
  index(@Query('sent') sent?: string): string {
    const latest = this.posts.findPublished()[0];
    const base = (getSettings().siteUrl || '').replace(/\/+$/, '');

    return newsletterAdminPage({
      stats: this.subscribers.stats(),
      flash: sent
        ? `Sent to ${sent} subscriber${sent === '1' ? '' : 's'}.`
        : undefined,
      defaultSubject: latest ? `New: ${latest.title}` : '',
      defaultMessage: latest
        ? `${latest.subtitle || latest.title}\n\nRead it here: ${base}/post/${latest.slug}`
        : '',
    });
  }

  @Post('send')
  async send(
    @Body() body: { subject?: string; message?: string },
    @Res() res: Response,
  ): Promise<void> {
    const subject = (body.subject ?? '').trim();
    const message = (body.message ?? '').trim();

    if (!subject || !message) {
      res.redirect(NewsletterAdminRoutes.index.template);
      return;
    }

    const base = (getSettings().siteUrl || '').replace(/\/+$/, '');
    const recipients = this.subscribers.listConfirmed();

    for (const subscriber of recipients) {
      const unsubscribeLink = `${base}${NewsletterRoutes.unsubscribe.template}?token=${subscriber.unsubscribeToken}`;

      await this.mailer.send({
        ...newsletterIssueEmail({ subject, message, unsubscribeLink }),
        to: subscriber.email,
      });
    }

    res.redirect(
      `${NewsletterAdminRoutes.index.template}?sent=${recipients.length}`,
    );
  }
}
