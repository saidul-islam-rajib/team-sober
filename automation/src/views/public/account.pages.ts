import {
  ACCOUNT_BENEFITS,
  AccountBenefit,
  AccountStep,
  AccountView,
  MAX_COURSE_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_REQUEST_NOTE_LENGTH,
  REGISTRATION_STEPS,
  RESET_LINK_STEPS,
  SETUP_LINK_STEPS,
  TokenPurpose,
  recoveryCodeShape,
} from '../../accounts/account.model';
import { AccountRoutes, accountUrl } from '../../accounts/account.routes';
import { ACCOUNT_BUNDLE } from '../../accounts/account.assets';
import {
  AccountPolicy,
  RecoveryPolicy,
  SupportPolicy,
} from '../../shared/config/policies';
import { css, js } from '../../shared/assets/asset.store';
import { UI_BUNDLE } from '../../shared/assets/assets.bootstrap';
import {
  Renderable,
  SafeHtml,
  html,
  join,
  toHtml,
  when,
} from '../../shared/view/html';
import {
  banner,
  field,
  linkButton,
  submitButton,
} from '../../shared/view/components';
import { initials } from '../../settings/settings.model';
import { formatDay } from '../../shared/format/dates';
import { layout } from '../shared/layout';

const STYLES = [css(UI_BUNDLE), css(ACCOUNT_BUNDLE)];
const SCRIPTS = [js(UI_BUNDLE)];

interface FormState {
  error?: string;
  name?: string;
  email?: string;
  next?: string;
}

interface Panel {
  heading: string;
  markup: SafeHtml;
}

function nextField(next?: string): SafeHtml {
  return when(
    next,
    () => html`<input type="hidden" name="next" value="${next}" />`,
  );
}

function withNext(path: string, next?: string): string {
  return accountUrl(path, { next });
}

function passwordField(label: string): SafeHtml {
  return field({
    name: 'password',
    label,
    type: 'password',
    required: true,
    autocomplete: 'new-password',
    placeholder: `At least ${RecoveryPolicy.minPasswordLength} characters`,
    attrs: {
      minlength: RecoveryPolicy.minPasswordLength,
      maxlength: MAX_PASSWORD_LENGTH,
    },
  });
}

function emailField(value?: string, hint?: string): SafeHtml {
  return field({
    name: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    autocomplete: 'email',
    value,
    placeholder: 'you@example.com',
    hint,
    attrs: { maxlength: MAX_EMAIL_LENGTH },
  });
}

function benefitPanel(benefits: AccountBenefit[]): Panel {
  return {
    heading: 'What an account gives you',
    markup: html`<ul class="account-perks">
      ${join(
        benefits.map(
          (benefit) =>
            html`<li class="account-perk">
              <span class="perk-icon" aria-hidden="true">${benefit.icon}</span>
              <div><b>${benefit.title}</b><span>${benefit.detail}</span></div>
            </li>`,
        ),
      )}
    </ul>`,
  };
}

function stepPanel(steps: AccountStep[], heading = 'How it works'): Panel {
  return {
    heading,
    markup: html`<ol class="account-steps">
      ${join(
        steps.map(
          (step) =>
            html`<li class="account-step">
              <div><b>${step.title}</b><span>${step.detail}</span></div>
            </li>`,
        ),
      )}
    </ol>`,
  };
}

function statsPanel(opts: {
  coursesInProgress: number;
  certificates: number;
  memberSince?: string;
}): Panel {
  const rows: { icon: string; value: string; label: string }[] = [
    {
      icon: '📚',
      value: String(opts.coursesInProgress),
      label: `course${opts.coursesInProgress === 1 ? '' : 's'} in progress`,
    },
    {
      icon: '★',
      value: String(opts.certificates),
      label: `certificate${opts.certificates === 1 ? '' : 's'} earned`,
    },
  ];

  if (opts.memberSince) {
    rows.push({ icon: '◔', value: opts.memberSince, label: 'member since' });
  }

  return {
    heading: 'At a glance',
    markup: html`<ul class="account-perks">
      ${join(
        rows.map(
          (row) =>
            html`<li class="account-perk">
              <span class="perk-icon" aria-hidden="true">${row.icon}</span>
              <div><b>${row.value}</b><span>${row.label}</span></div>
            </li>`,
        ),
      )}
    </ul>`,
  };
}

function shell(main: Renderable, panel?: Panel): SafeHtml {
  if (!panel)
    return html`<section class="account-shell solo">${main}</section>`;

  return html`<section class="account-shell">
    ${main}
    <aside class="account-aside">
      <h2>${panel.heading}</h2>
      ${panel.markup}
    </aside>
  </section>`;
}

function page(title: string, body: SafeHtml, path: string): string {
  return layout({
    title,
    body: toHtml(body),
    path,
    styles: STYLES,
    scripts: SCRIPTS,
    noindex: true,
  });
}

export function registerPage(state: FormState = {}): string {
  const main = html`<div class="account-main">
    <p class="account-eyebrow">Free account</p>
    <h1>Create an account</h1>
    <p class="account-lede">
      Give us a name and an address and we will email you a link to choose a
      password. Your progress and your certificates are then tied to you rather
      than to this browser.
    </p>

    ${when(state.error, () => banner({ kind: 'error', message: state.error }))}

    <form method="post" action="${AccountRoutes.register.template}">
      ${nextField(state.next)}
      ${field({
        name: 'name',
        label: 'Name',
        required: true,
        autocomplete: 'name',
        value: state.name,
        placeholder: 'The name on your certificates',
        attrs: { maxlength: MAX_NAME_LENGTH },
      })}
      ${emailField(state.email, 'Used to sign in, and to send your password link.')}
      ${submitButton({ label: 'Email me a link' })}
    </form>

    <p class="account-alt">
      Already have one?
      <a href="${withNext(AccountRoutes.signIn.template, state.next)}"
        >Sign in instead</a
      >
    </p>
  </div>`;

  return page(
    'Create an account',
    shell(main, stepPanel(REGISTRATION_STEPS)),
    AccountRoutes.register.template,
  );
}

export interface CheckEmailState {
  email: string;
  failed?: boolean;
  reset?: boolean;
}

export function checkEmailPage({
  email,
  failed,
  reset,
}: CheckEmailState): string {
  const minutes = AccountPolicy.passwordLinkMinutes;

  const main = html`<div class="account-main">
    <p class="account-eyebrow">${reset ? 'Password reset' : 'Almost there'}</p>
    <h1>Check your email</h1>

    ${when(failed, () =>
      banner({
        kind: 'error',
        message:
          'We could not send the email just now. Try again in a few minutes, ' +
          'and if it keeps failing let the owner know.',
      }),
    )}

    <p class="account-lede">
      If <b>${email}</b> has an account, a link to
      ${reset ? 'choose a new password' : 'set your password'} is on its way. It
      works once and expires in ${minutes} minutes.
    </p>

    <p class="account-empty">
      Nothing after a minute or two? Check the spam folder, and make sure the
      address above is the one you meant.
    </p>

    ${linkButton({
      href: AccountRoutes.signIn.template,
      label: 'Back to sign in',
      variant: 'ghost',
    })}
  </div>`;

  const panel = stepPanel(
    reset ? RESET_LINK_STEPS : SETUP_LINK_STEPS,
    'What happens next',
  );

  return page(
    'Check your email',
    shell(main, panel),
    AccountRoutes.register.template,
  );
}

export function signInPage(state: FormState = {}): string {
  const main = html`<div class="account-main">
    <p class="account-eyebrow">Welcome back</p>
    <h1>Sign in</h1>
    <p class="account-lede">
      Pick up where you left off. You stay signed in on this device.
    </p>

    ${when(state.error, () => banner({ kind: 'error', message: state.error }))}

    <form method="post" action="${AccountRoutes.signIn.template}">
      ${nextField(state.next)} ${emailField(state.email)}
      ${field({
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        autocomplete: 'current-password',
        placeholder: 'Your password',
        attrs: { maxlength: MAX_PASSWORD_LENGTH },
      })}
      ${submitButton({ label: 'Sign in' })}
    </form>

    <p class="account-alt account-alt-row">
      <span
        >No account yet?
        <a href="${withNext(AccountRoutes.register.template, state.next)}"
          >Create one</a
        >
      </span>
      <a href="${withNext(AccountRoutes.recover.template, state.next)}"
        >Forgotten your password?</a
      >
    </p>
  </div>`;

  return page(
    'Sign in',
    shell(main, benefitPanel(ACCOUNT_BENEFITS)),
    AccountRoutes.signIn.template,
  );
}

export interface SetPasswordState {
  token?: string;
  name?: string;
  purpose?: TokenPurpose;
  error?: string;
  valid: boolean;
  next?: string;
}

export function setPasswordPage(state: SetPasswordState): string {
  const resetting = state.purpose === TokenPurpose.Reset;

  if (!state.valid) {
    const main = html`<div class="account-main">
      <p class="account-eyebrow">Password link</p>
      <h1>That link will not work</h1>
      ${banner({ kind: 'error', message: state.error })}
      <p class="account-lede">
        Links can only be used once, and expire after
        ${AccountPolicy.passwordLinkMinutes} minutes. Ask for a fresh one and it
        will replace anything outstanding.
      </p>
      ${linkButton({
        href: AccountRoutes.recover.template,
        label: 'Send me a new link',
      })}
    </div>`;

    return page(
      'That link will not work',
      shell(main),
      AccountRoutes.setPassword.template,
    );
  }

  const main = html`<div class="account-main">
    <p class="account-eyebrow">${resetting ? 'Password reset' : 'One last step'}</p>
    <h1>${resetting ? 'Choose a new password' : 'Choose your password'}</h1>
    <p class="account-lede">
      ${state.name ? `Hello ${state.name}. ` : ''}Pick something you do not use
      anywhere else. You will be signed in as soon as it is saved.
    </p>

    ${when(state.error, () => banner({ kind: 'error', message: state.error }))}

    <form method="post" action="${AccountRoutes.setPassword.template}">
      ${nextField(state.next)}
      <input type="hidden" name="token" value="${state.token}" />
      ${passwordField('Password')}
      ${submitButton({ label: 'Save it and sign me in' })}
    </form>
  </div>`;

  return page(
    resetting ? 'Choose a new password' : 'Choose your password',
    shell(main, stepPanel(REGISTRATION_STEPS)),
    AccountRoutes.setPassword.template,
  );
}

export interface AccountPageState {
  account: AccountView;
  certificates: { course: string; href: string; issued: string }[];
  courses?: { title: string; href: string; done: number; total: number }[];
  hasPassword?: boolean;
  linkSent?: boolean;
  error?: string;
  memberSince?: string;
}

export function accountPage({
  account,
  certificates,
  courses = [],
  hasPassword = true,
  linkSent,
  error,
  memberSince,
}: AccountPageState): string {
  const certRows = certificates.map(
    (certificate) =>
      html`<a class="account-cert" href="${certificate.href}">
        <span class="account-cert-mark" aria-hidden="true">★</span>
        <div>
          <b>${certificate.course}</b><span>Issued ${certificate.issued}</span>
        </div>
      </a>`,
  );

  const courseRows = courses.map((course) => {
    const pct =
      course.total > 0 ? Math.round((course.done / course.total) * 100) : 0;

    return html`<a class="account-cert account-course" href="${course.href}">
      <span class="account-cert-mark" aria-hidden="true"
        >${course.done}/${course.total}</span
      >
      <div class="account-course-body">
        <b>${course.title}</b>
        <span>${course.total - course.done} left to read</span>
        <div class="account-progress-track">
          <div
            class="account-progress-fill"
            style="width:${pct}%"
          ></div>
        </div>
      </div>
    </a>`;
  });

  const main = html`<div class="account-main">
    <div class="account-head">
      <span class="account-avatar" aria-hidden="true"
        >${initials(account.name)}</span
      >
      <div>
        <h1>${account.name}</h1>
        <p class="account-lede">${account.email}</p>
      </div>
    </div>

    <h2 class="account-section">Courses in progress</h2>
    ${
      courses.length
        ? join(courseRows)
        : html`<p class="account-empty">
            Start a course and it will show up here with how far along you are.
          </p>`
    }

    <h2 class="account-section">Certificates</h2>
    ${
      certificates.length
        ? join(certRows)
        : html`<p class="account-empty">
            Finish every lesson in a course and your certificate will appear
            here.
          </p>`
    }

    <h2 class="account-section" id="password">Password</h2>
    ${when(error, () => banner({ kind: 'error', message: error }))}
    ${when(linkSent, () =>
      banner({
        kind: 'ok',
        message: `A link is on its way to ${account.email}. It works once and expires in ${AccountPolicy.passwordLinkMinutes} minutes.`,
      }),
    )}

    <div class="recovery-panel">
      <p>
        ${
          hasPassword
            ? 'Changing your password signs you out everywhere else. We email you a link rather than asking for the old one, so a borrowed browser is no way in.'
            : 'You signed in from another Team Sober service, so there is no password on this account yet. Set one and you can sign in here directly too.'
        }
      </p>

      <form method="post" action="${AccountRoutes.passwordLink.template}">
        ${submitButton({
          label: hasPassword ? 'Email me a password link' : 'Set a password',
          variant: 'ghost',
        })}
      </form>
    </div>

    <form
      method="post"
      action="${AccountRoutes.signOut.template}"
      class="account-signout"
    >
      ${submitButton({ label: 'Sign out', variant: 'ghost' })}
    </form>
  </div>`;

  const panel = statsPanel({
    coursesInProgress: courses.length,
    certificates: certificates.length,
    memberSince: memberSince ? formatDay(memberSince) : undefined,
  });

  return page(account.name, shell(main, panel), AccountRoutes.home.template);
}

export interface RecoverState extends FormState {
  course?: string;
  requestNote?: string;
  requestError?: string;
  requested?: boolean;
}

export function recoverPage(state: RecoverState = {}): string {
  const main = html`<div class="account-main">
    <p class="account-eyebrow">Account recovery</p>
    <h1>Forgotten your password?</h1>
    <p class="account-lede">
      Give us the address on your account and we will email a link to choose a
      new password. Your old one keeps working until you use it.
    </p>

    ${when(state.error, () => banner({ kind: 'error', message: state.error }))}

    <form method="post" action="${AccountRoutes.recover.template}">
      ${nextField(state.next)} ${emailField(state.email)}
      ${submitButton({ label: 'Email me a link' })}
    </form>

    ${stuckPanel(state)}

    <p class="account-alt account-alt-row">
      <span
        >Remembered it?
        <a href="${AccountRoutes.signIn.template}">Sign in</a></span
      >
      <a href="${AccountRoutes.register.template}">Create an account</a>
    </p>
  </div>`;

  return page(
    'Forgotten your password?',
    shell(main),
    AccountRoutes.recover.template,
  );
}

function stuckPanel(state: RecoverState): SafeHtml {
  return html`<div class="account-stuck" id="stuck">
    <b>Lost the address as well?</b>
    <p>
      A password link is no help if you can no longer read the mailbox it goes
      to. Ask the owner directly on
      <a href="${SupportPolicy.channelUrl}">${SupportPolicy.channelLabel}</a>,
      or send the request below. Either way it goes to a person, who checks it is
      really you before sending a code that works once and expires after
      ${RecoveryPolicy.resetLinkMinutes} minutes.
    </p>

    ${state.requested ? requestSent() : requestForm(state)}

    <p class="account-stuck-foot">
      Your progress and certificates are untouched by any of this.
    </p>
  </div>`;
}

function requestSent(): SafeHtml {
  return banner({
    kind: 'ok',
    message:
      'Thanks — if that address has an account, the owner will be in touch to get you back in. There is nothing more to do here.',
  });
}

function requestForm(state: RecoverState): SafeHtml {
  return html`${when(state.requestError, () =>
    banner({ kind: 'error', message: state.requestError }),
  )}
  <form method="post" action="${AccountRoutes.recoverRequest.template}" class="stuck-form">
    ${nextField(state.next)}
    ${field({
      name: 'email',
      label: 'Email on the account',
      type: 'email',
      required: true,
      autocomplete: 'email',
      value: state.email,
      placeholder: 'you@example.com',
      attrs: { maxlength: MAX_EMAIL_LENGTH },
    })}
    ${field({
      name: 'course',
      label: 'Which course were you taking?',
      value: state.course,
      placeholder: 'e.g. Networking',
      hint: 'Helps the owner find your account and confirm it is you.',
      attrs: { maxlength: MAX_COURSE_LENGTH },
    })}
    <div class="ui-field">
      <label for="field-request-note">Anything else worth knowing (optional)</label>
      <textarea id="field-request-note" name="note" rows="3"
                maxlength="${MAX_REQUEST_NOTE_LENGTH}"
                placeholder="When you registered, roughly, or anything that identifies you.">${state.requestNote ?? ''}</textarea>
    </div>
    ${submitButton({ label: 'Send a recovery request', variant: 'ghost' })}
  </form>`;
}

export function resetPage(state: FormState & { code?: string } = {}): string {
  const main = html`<div class="account-main">
    <p class="account-eyebrow">Reset code</p>
    <h1>Choose a new password</h1>
    <p class="account-lede">
      This code was issued by hand for one account and can be used once, within
      ${RecoveryPolicy.resetLinkMinutes} minutes. Set a password and you will be
      signed in.
    </p>

    ${when(state.error, () => banner({ kind: 'error', message: state.error }))}

    <form method="post" action="${AccountRoutes.reset.template}">
      ${nextField(state.next)}
      ${emailField(
        state.email,
        'The address on the account the code was issued for.',
      )}
      ${field({
        name: 'code',
        label: 'Reset code',
        required: true,
        value: state.code,
        placeholder: recoveryCodeShape(),
        hint: 'Dashes and capitals do not matter.',
        attrs: { autocomplete: 'off', spellcheck: 'false' },
      })}
      ${passwordField('New password')}
      ${submitButton({ label: 'Set a new password' })}
    </form>

    <p class="account-alt account-alt-row">
      <span
        >Code expired?
        <a href="${AccountRoutes.recover.template}">Ask for another</a></span
      >
      <a href="${AccountRoutes.signIn.template}">Sign in</a>
    </p>
  </div>`;

  return page(
    'Choose a new password',
    shell(main),
    AccountRoutes.reset.template,
  );
}
