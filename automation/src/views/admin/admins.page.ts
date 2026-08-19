import { Admin } from '../../admins/admin.model';
import { AdminsRoutes } from '../../admins/admins.routes';
import { ACCOUNT_ADMIN_BUNDLE } from '../../accounts/account.assets';
import { formatDay } from '../../shared/format/dates';
import { css, js } from '../../shared/assets/asset.store';
import { UI_BUNDLE } from '../../shared/assets/assets.bootstrap';
import { SafeHtml, html, toHtml, when } from '../../shared/view/html';
import {
  Column,
  banner,
  field,
  linkButton,
  panel,
  submitButton,
  table,
  toolbar,
} from '../../shared/view/components';
import { adminNav, layout } from '../shared/layout';

const STYLES = [css(UI_BUNDLE), css(ACCOUNT_ADMIN_BUNDLE)];
const SCRIPTS = [js(UI_BUNDLE)];

function render(title: string, body: SafeHtml, path: string): string {
  return layout({
    title,
    body: toHtml(body),
    nav: adminNav(path),
    variant: 'admin',
    styles: STYLES,
    scripts: SCRIPTS,
    noindex: true,
  });
}

function createForm(email?: string): SafeHtml {
  return panel({
    title: 'Add an admin',
    body: html`<form method="post" action="${AdminsRoutes.list.template}">
      ${field({
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        autocomplete: 'off',
        value: email,
        placeholder: 'name@example.com',
      })}
      ${field({
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        autocomplete: 'new-password',
        placeholder: 'A password only they know',
      })}
      ${submitButton({ label: 'Add admin' })}
    </form>`,
  });
}

export interface AdminsListState {
  admins: Admin[];
  flash?: string;
  error?: string;
  email?: string;
}

export function adminsPage({
  admins,
  flash,
  error,
  email,
}: AdminsListState): string {
  const columns: Column<Admin>[] = [
    {
      header: 'Email',
      cell: (admin) => html`<span class="t">${admin.email}</span>`,
    },
    {
      header: 'Added',
      cell: (admin) =>
        html`<span class="s">${formatDay(admin.createdAt)}</span>`,
    },
    {
      header: '',
      align: 'end',
      cell: (admin) =>
        linkButton({
          href: AdminsRoutes.detail.path({ id: admin.id }),
          label: 'Manage',
          variant: 'ghost',
          attrs: { class: 'btn btn-ghost btn-sm' },
        }),
    },
  ];

  const body = html`${toolbar({
    title: 'Admins',
    subtitle: `${admins.length} admin${admins.length === 1 ? '' : 's'} can sign in to manage this site`,
    back: { href: '/admin', label: '← Back to dashboard' },
  })}
    ${when(flash, () => banner({ kind: 'ok', message: flash }))}
    ${when(error, () => banner({ kind: 'error', message: error }))}

    <div class="acct-grid">
      <div>
        ${table({
          columns,
          rows: admins,
          empty: 'No admins yet — the site owner password still works.',
        })}
      </div>
      <aside>
        ${createForm(email)}
        ${panel({
          title: 'About the site owner password',
          body: html`<p class="ui-hint">
            Signing in with the <code>ADMIN_PASSWORD</code> environment
            variable still works alongside these accounts, and is not listed
            here — it belongs to whoever runs the server, not to a person.
          </p>`,
        })}
      </aside>
    </div>`;

  return render('Admins', body, AdminsRoutes.list.template);
}

export interface AdminDetailState {
  admin: Admin;
  flash?: string;
  error?: string;
}

export function adminDetailPage({
  admin,
  flash,
  error,
}: AdminDetailState): string {
  const body = html`${toolbar({
    title: admin.email,
    subtitle: `Added ${formatDay(admin.createdAt)}`,
    back: { href: AdminsRoutes.list.template, label: '← Back to admins' },
  })}
    ${when(flash, () => banner({ kind: 'ok', message: flash }))}
    ${when(error, () => banner({ kind: 'error', message: error }))}

    <div class="acct-grid">
      <div>
        ${panel({
          title: 'Change email',
          body: html`<form
            method="post"
            action="${AdminsRoutes.changeEmail.path({ id: admin.id })}"
          >
            ${field({
              name: 'email',
              label: 'Email',
              type: 'email',
              required: true,
              value: admin.email,
              autocomplete: 'off',
            })}
            ${submitButton({ label: 'Update email' })}
          </form>`,
        })}
        ${panel({
          title: 'Set a new password',
          body: html`<form
            method="post"
            action="${AdminsRoutes.resetPassword.path({ id: admin.id })}"
          >
            ${field({
              name: 'password',
              label: 'New password',
              type: 'password',
              required: true,
              autocomplete: 'new-password',
              placeholder: 'A password only they know',
            })}
            ${submitButton({ label: 'Set password' })}
          </form>`,
        })}
      </div>

      <aside>
        ${panel({
          title: 'Remove this admin',
          body: html`<p class="ui-hint" style="margin-bottom:.9rem">
              They immediately lose the ability to sign in with this email.
              A session already open in a browser stays open until it expires
              or they sign out.
            </p>
            <form
              method="post"
              action="${AdminsRoutes.remove.path({ id: admin.id })}"
              onsubmit="return confirm('Remove this admin?')"
            >
              ${submitButton({ label: 'Remove admin', variant: 'danger' })}
            </form>`,
        })}
      </aside>
    </div>`;

  return render(`${admin.email} — admins`, body, AdminsRoutes.list.template);
}
