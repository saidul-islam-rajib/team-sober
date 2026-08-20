import { getSettings } from '../../settings/settings.store';
import { SafeHtml, html, toHtml } from '../view/html';
import { MailMessage } from './mail.message';

interface LinkMail {
  name: string;
  link: string;
  minutes: number;
}

function siteName(): string {
  return getSettings().siteTitle || 'Team Sober';
}

function wrap(heading: string, lede: string, body: SafeHtml): string {
  return toHtml(html`<!doctype html>
    <html>
      <body
        style="margin:0;padding:24px;background:#f8fafc;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a"
      >
        <div
          style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px"
        >
          <h1 style="margin:0 0 8px;font-size:20px">${heading}</h1>
          <p style="margin:0 0 24px;color:#475569;font-size:14px">${lede}</p>
          ${body}
        </div>
      </body>
    </html>`);
}

function callToAction(label: string, link: string, minutes: number): SafeHtml {
  return html`<a
      href="${link}"
      style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px"
      >${label}</a
    >
    <p style="margin:24px 0 0;color:#64748b;font-size:12px">
      This link expires in ${minutes} minutes and can only be used once. If the
      button does not work, paste this into your browser:
    </p>
    <p style="margin:8px 0 0;color:#64748b;font-size:12px;word-break:break-all">
      ${link}
    </p>`;
}

export function passwordSetupEmail({
  name,
  link,
  minutes,
}: LinkMail): MailMessage {
  const site = siteName();

  const text = [
    `Hello ${name},`,
    '',
    `An account was created for you on ${site}.`,
    `Open the link below to choose a password. It expires in ${minutes} minutes.`,
    '',
    link,
    '',
    'If you did not expect this email you can safely ignore it. No password is set until the link is used.',
    '',
    site,
  ].join('\n');

  return {
    to: '',
    subject: `Set your ${site} password`,
    text,
    html: wrap(
      site,
      `Hello ${name}, choose a password to finish setting up your account.`,
      html`${callToAction('Create your password', link, minutes)}
        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">
          If you did not expect this email you can ignore it. No password is set
          until the link is used.
        </p>`,
    ),
  };
}

export function subscribeConfirmEmail({
  link,
  minutes,
}: {
  link: string;
  minutes: number;
}): MailMessage {
  const site = siteName();

  const text = [
    `Someone requested email updates from ${site} using this address.`,
    `Confirm the subscription by opening the link below. It expires in ${minutes} minutes.`,
    '',
    link,
    '',
    'If this was not you, ignore this email — nothing is added to the list until the link is used.',
    '',
    site,
  ].join('\n');

  return {
    to: '',
    subject: `Confirm your ${site} subscription`,
    text,
    html: wrap(
      site,
      `Confirm you want email updates from ${site}.`,
      html`${callToAction('Confirm subscription', link, minutes)}
        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">
          If this was not you, ignore this email — nothing is added to the
          list until the link is used.
        </p>`,
    ),
  };
}

export function newsletterIssueEmail({
  subject,
  message,
  unsubscribeLink,
}: {
  subject: string;
  message: string;
  unsubscribeLink: string;
}): MailMessage {
  const site = siteName();

  const text = [message, '', `Unsubscribe: ${unsubscribeLink}`, '', site].join(
    '\n',
  );

  return {
    to: '',
    subject,
    text,
    html: wrap(
      site,
      subject,
      html`<div
          style="white-space:pre-wrap;color:#0f172a;font-size:14px;line-height:1.6"
        >
          ${message}
        </div>
        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">
          <a href="${unsubscribeLink}" style="color:#94a3b8"
            >Unsubscribe</a
          >
        </p>`,
    ),
  };
}

export function passwordResetEmail({
  name,
  link,
  minutes,
}: LinkMail): MailMessage {
  const site = siteName();

  const text = [
    `Hello ${name},`,
    '',
    `Somebody asked to reset the password for your ${site} account.`,
    `Open the link below to choose a new one. It expires in ${minutes} minutes and can only be used once.`,
    '',
    link,
    '',
    'If this was not you, ignore this email. Your current password keeps working until the link is used.',
    '',
    site,
  ].join('\n');

  return {
    to: '',
    subject: `Reset your ${site} password`,
    text,
    html: wrap(
      site,
      `Hello ${name}, somebody asked to reset your password. Choose a new one below.`,
      html`${callToAction('Reset your password', link, minutes)}
        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">
          If this was not you, ignore this email. Your current password keeps
          working until the link is used.
        </p>`,
    ),
  };
}
