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

export function isMailConfigured(): boolean {
  return Boolean(mailConfig.host && mailConfig.from);
}
