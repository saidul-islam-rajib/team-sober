import { SystemHealth } from '../../system/system.service';
import { css, js } from '../../shared/assets/asset.store';
import { UI_BUNDLE } from '../../shared/assets/assets.bootstrap';
import {
  banner,
  panel,
  pill,
  submitButton,
  toolbar,
} from '../../shared/view/components';
import { SafeHtml, html, toHtml, when } from '../../shared/view/html';
import { adminNav, layout } from '../shared/layout';

const STYLES = [css(UI_BUNDLE)];
const SCRIPTS = [js(UI_BUNDLE)];

const SYSTEM_ROUTE = '/admin/system';

function render(title: string, body: SafeHtml): string {
  return layout({
    title,
    body: toHtml(body),
    nav: adminNav(SYSTEM_ROUTE),
    variant: 'admin',
    styles: STYLES,
    scripts: SCRIPTS,
    noindex: true,
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }

  return `${value.toFixed(1)} ${units[unit]}`;
}

function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts = [
    days ? `${days}d` : '',
    hours ? `${hours}h` : '',
    `${minutes}m`,
  ].filter(Boolean);

  return parts.join(' ');
}

function configRow(label: string, ok: boolean, hintIfMissing: string) {
  return html`<div class="check-row">
    ${pill({ label: ok ? 'Set' : 'Missing', tone: ok ? 'good' : 'warn' })}
    <div>
      <div class="t">${label}</div>
      ${when(!ok, () => html`<div class="s">${hintIfMissing}</div>`)}
    </div>
  </div>`;
}

export interface SystemPageState {
  health: SystemHealth;
  flash?: string;
  restarting?: boolean;
}

export function systemPage({
  health,
  flash,
  restarting = false,
}: SystemPageState): string {
  const { config, memory, dataDir, counts } = health;

  const body = html`<style>
      .check-row {
        display: flex; align-items: flex-start; gap: 0.7rem;
        padding: 0.55rem 0; border-bottom: 1px solid var(--border);
      }
      .check-row:last-child { border-bottom: 0; }
      .check-row .t { font-size: 0.88rem; color: var(--ink); font-weight: 600; }
      .check-row .s { font-size: 0.78rem; color: var(--ink-3); margin-top: 0.1rem; }
      .stat-grid {
        display: grid; gap: 0.85rem;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      }
      .stat-tile {
        background: var(--surface-2); border: 1px solid var(--border);
        border-radius: 12px; padding: 0.9rem 1rem;
      }
      .stat-tile .v { font-size: 1.25rem; font-weight: 700; color: var(--ink); }
      .stat-tile .l { font-size: 0.75rem; color: var(--ink-3); margin-top: 0.15rem; }
      .system-grid {
        display: grid; gap: 1.25rem; grid-template-columns: 1fr 1fr;
        align-items: start;
      }
      @media (max-width: 860px) { .system-grid { grid-template-columns: 1fr; } }
    </style>
    ${toolbar({
      title: 'System',
      subtitle: `Up ${formatUptime(health.uptimeSeconds)} · ${counts.posts} posts · ${counts.comments} comments · ${counts.confirmedSubscribers} subscribers`,
      back: { href: '/admin', label: '← Back to dashboard' },
    })}
    ${when(flash, () => banner({ kind: 'ok', message: flash }))}
    ${when(
      restarting,
      () =>
        html`<div class="flash ok" style="margin-bottom:1.5rem">
          Restarting now — this page will be unreachable for a few seconds.
          It only comes back on its own if the process is configured to
          restart automatically (Docker <code>--restart unless-stopped</code>,
          PM2, or systemd). Refresh in a moment.
        </div>`,
    )}

    <div class="system-grid">
      <div>
        ${panel({
          title: 'Configuration',
          body: html`${configRow(
            'ADMIN_PASSWORD',
            config.adminPasswordSet,
            'Unset — the admin area cannot be signed into at all.',
          )}
            ${configRow(
              'SESSION_SECRET',
              config.sessionSecretSet,
              'Unset — a random key is used instead, so every restart signs everyone out.',
            )}
            ${configRow(
              'AUTH_SECRET (≥ 32 chars)',
              config.authSecretSet,
              'Unset or short — single sign-on with other Team Sober apps will not work.',
            )}
            ${configRow(
              'TRUST_PROXY',
              config.trustProxySet,
              'Unset — if this runs behind a reverse proxy, rate limiting will bucket every visitor together.',
            )}
            ${configRow(
              'Mail (SMTP)',
              config.mailConfigured,
              'Not configured — account, comment sign-in and newsletter emails only log to the console.',
            )}`,
        })}
      </div>

      <div>
        ${panel({
          title: 'Resource usage',
          body: html`<div class="stat-grid">
            <div class="stat-tile">
              <div class="v">${formatBytes(memory.rssBytes)}</div>
              <div class="l">Memory (RSS)</div>
            </div>
            <div class="stat-tile">
              <div class="v">${formatBytes(memory.heapUsedBytes)} / ${formatBytes(memory.heapTotalBytes)}</div>
              <div class="l">Heap used / total</div>
            </div>
            <div class="stat-tile">
              <div class="v">${formatBytes(dataDir.bytes)}</div>
              <div class="l">Data directory (${dataDir.files} files)</div>
            </div>
          </div>`,
        })}
        ${panel({
          title: 'Login lockouts',
          body: html`<p class="ui-hint" style="margin-bottom:1rem">
              ${health.loginLockouts} address${health.loginLockouts === 1 ? '' : 'es'}
              currently locked out. This is in-memory and per instance, so it
              clears on its own after the lockout window — or immediately,
              here.
            </p>
            <form
              method="post"
              action="${SYSTEM_ROUTE}/clear-lockouts"
              onsubmit="return confirm('Clear every current login lockout?')"
            >
              ${submitButton({
                label: 'Clear all lockouts',
                variant: 'ghost',
              })}
            </form>`,
        })}
        ${panel({
          title: 'Restart',
          tone: 'accent',
          body: html`<p class="ui-hint" style="margin-bottom:1rem">
              Stops the process immediately. It only comes back on its own if
              this is running under something that restarts it automatically
              — Docker with <code>--restart unless-stopped</code>, PM2, or a
              systemd unit with <code>Restart=always</code>. Without that,
              the site stays down until someone starts it by hand.
            </p>
            <form
              method="post"
              action="${SYSTEM_ROUTE}/restart"
              onsubmit="return confirm('Restart the app now? The site will be briefly unreachable.')"
            >
              ${submitButton({ label: 'Restart app', variant: 'danger' })}
            </form>`,
        })}
      </div>
    </div>`;

  return render('System', body);
}
