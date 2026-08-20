import { SiteSettings } from '../../settings/settings.model';
import { css, js } from '../../shared/assets/asset.store';
import { UI_BUNDLE } from '../../shared/assets/assets.bootstrap';
import { linkButton, panel, toolbar } from '../../shared/view/components';
import { SafeHtml, html, toHtml } from '../../shared/view/html';
import { adminNav, avatarMark, layout } from '../shared/layout';

const STYLES = [css(UI_BUNDLE)];
const SCRIPTS = [js(UI_BUNDLE)];

const ACCOUNT_ROUTE = '/admin/account';

function render(title: string, body: SafeHtml): string {
  return layout({
    title,
    body: toHtml(body),
    nav: adminNav(ACCOUNT_ROUTE),
    variant: 'admin',
    styles: STYLES,
    scripts: SCRIPTS,
    noindex: true,
  });
}

export interface AccountHubState {
  settings: SiteSettings;
}

export function accountHubPage({ settings }: AccountHubState): string {
  const body = html`<style>
      .account-hub-profile { display: flex; align-items: center; gap: 1rem; }
      .account-hub-profile .mark { width: 3.5rem; height: 3.5rem; font-size: 1.2rem; }
      .account-hub-profile h2 { font-size: 1.15rem; color: var(--ink); margin-bottom: 0.2rem; }
      .account-hub-profile p { font-size: 0.85rem; color: var(--ink-3); }
      .account-hub-links {
        display: grid; gap: 0.85rem; margin: 1.5rem 0;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
      .account-hub-card {
        display: block; padding: 1.1rem 1.2rem;
        border: 1px solid var(--border); border-radius: 12px; background: var(--surface);
      }
      .account-hub-card:hover { border-color: var(--accent); }
      .account-hub-card b { display: block; font-size: 0.98rem; color: var(--ink); margin-bottom: 0.3rem; }
      .account-hub-card span { font-size: 0.82rem; color: var(--ink-3); line-height: 1.5; }
    </style>
    ${toolbar({
      title: 'Account',
      subtitle: 'Your profile, site configuration, and operations.',
      back: { href: '/admin', label: '← Back to dashboard' },
    })}
    ${panel({
      title: 'Profile',
      body: html`<div class="account-hub-profile">
          ${avatarMark(settings.avatarUrl, settings.authorName)}
          <div>
            <h2>${settings.authorName}</h2>
            <p>${settings.authorRole}</p>
          </div>
        </div>
        <p class="ui-hint" style="margin-top:1rem">
          <a href="/admin/settings">Edit your name, role, bio and photo →</a>
        </p>`,
    })}

    <div class="account-hub-links">
      <a class="account-hub-card" href="/admin/settings">
        <b>Settings</b>
        <span>Profile, site identity, and footer links.</span>
      </a>
      <a class="account-hub-card" href="/admin/system">
        <b>System</b>
        <span>Health, configuration checks, and restart.</span>
      </a>
      <a class="account-hub-card" href="/admin/admins">
        <b>Admins</b>
        <span>Add, remove, or reset the password for an admin.</span>
      </a>
    </div>

    ${panel({
      title: 'Sign out',
      body: html`<p class="ui-hint" style="margin-bottom:1rem">
          Ends your session on this device.
        </p>
        ${linkButton({ href: '/logout', label: 'Sign out', variant: 'danger' })}`,
    })}`;

  return render('Account', body);
}
