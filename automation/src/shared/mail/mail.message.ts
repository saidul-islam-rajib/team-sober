export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type MailResult =
  | { ok: true; delivered: true }
  | { ok: true; delivered: false; preview: string }
  | { ok: false; error: string };
