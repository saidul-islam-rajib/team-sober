import { NewsletterAdminRoutes } from '../../newsletter/newsletter.routes';
import { SubscriberStats } from '../../newsletter/subscriber.model';
import { css, js } from '../../shared/assets/asset.store';
import { UI_BUNDLE } from '../../shared/assets/assets.bootstrap';
import {
  banner,
  field,
  panel,
  submitButton,
  toolbar,
} from '../../shared/view/components';
import { SafeHtml, html, toHtml, when } from '../../shared/view/html';
import { adminNav, layout } from '../shared/layout';

const STYLES = [css(UI_BUNDLE)];
const SCRIPTS = [js(UI_BUNDLE)];

function render(title: string, body: SafeHtml): string {
  return layout({
    title,
    body: toHtml(body),
    nav: adminNav(NewsletterAdminRoutes.index.template),
    variant: 'admin',
    styles: STYLES,
    scripts: SCRIPTS,
    noindex: true,
  });
}

export interface NewsletterAdminState {
  stats: SubscriberStats;
  flash?: string;
  defaultSubject?: string;
  defaultMessage?: string;
}

export function newsletterAdminPage({
  stats,
  flash,
  defaultSubject = '',
  defaultMessage = '',
}: NewsletterAdminState): string {
  const body = html`${toolbar({
    title: 'Newsletter',
    subtitle: `${stats.confirmed} confirmed subscriber${stats.confirmed === 1 ? '' : 's'}, ${stats.pending} awaiting confirmation, ${stats.unsubscribed} unsubscribed`,
    back: { href: '/admin', label: '← Back to dashboard' },
  })}
    ${when(flash, () => banner({ kind: 'ok', message: flash }))}

    ${panel({
      title: 'Send an issue',
      body: html`<p class="ui-hint" style="margin-bottom:1rem">
          This emails every confirmed subscriber (${stats.confirmed})
          immediately — there is no draft or schedule, so review before
          sending.
        </p>
        <form
          method="post"
          action="${NewsletterAdminRoutes.send.template}"
          onsubmit="return confirm('Send this to ${stats.confirmed} subscriber${stats.confirmed === 1 ? '' : 's'} now? This cannot be undone.')"
        >
          ${field({
            name: 'subject',
            label: 'Subject',
            required: true,
            value: defaultSubject,
          })}
          <div class="ui-field">
            <label for="field-message">Message</label>
            <textarea id="field-message" name="message" rows="8" required>${defaultMessage}</textarea>
          </div>
          ${submitButton({
            label: `Send to ${stats.confirmed} subscriber${stats.confirmed === 1 ? '' : 's'}`,
          })}
        </form>`,
    })}`;

  return render('Newsletter', body);
}
