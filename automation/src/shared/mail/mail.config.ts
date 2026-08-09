/**
 * SMTP settings, read from the environment rather than the admin config so a
 * password never lands in `config.json`.
 *
 * The variable names match the Bachelor Point (Mess) project deliberately: both
 * apps are operated by the same person against the same mailbox, so one block
 * of `.env` configures either.
 */
export const mailConfig = {
  get host(): string {
    return (process.env.SMTP_HOST ?? '').trim();
  },
  get port(): number {
    const port = Number(process.env.SMTP_PORT ?? 587);

    return Number.isFinite(port) && port > 0 ? port : 587;
  },
  get user(): string {
    return process.env.SMTP_USER ?? '';
  },
  get password(): string {
    return process.env.SMTP_PASSWORD ?? '';
  },
  get from(): string {
    return (process.env.SMTP_FROM ?? '').trim();
  },
  get helo(): string {
    return (process.env.SMTP_HELO ?? 'team-sober.com').trim();
  },
  get timeoutMs(): number {
    const ms = Number(process.env.SMTP_TIMEOUT_MS ?? 15_000);

    return Number.isFinite(ms) && ms > 0 ? ms : 15_000;
  },
};

/**
 * Without a host and a From address there is nowhere to send and nothing to
 * send as, so the mailer stays in preview mode and links are logged instead.
 */
export function isMailConfigured(): boolean {
  return Boolean(mailConfig.host && mailConfig.from);
}
