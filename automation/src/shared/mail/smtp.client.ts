import { Socket, connect as netConnect } from 'net';
import { TLSSocket, connect as tlsConnect } from 'tls';
import { mailConfig } from './mail.config';
import { MailMessage } from './mail.message';

const CRLF = '\r\n';

const IMPLICIT_TLS_PORT = 465;

export interface SmtpReply {
  code: number;
  text: string;
}

export function takeReply(
  buffer: string,
): { reply: SmtpReply; rest: string } | null {
  const lines = buffer.split(CRLF);

  for (let at = 0; at < lines.length - 1; at += 1) {
    if (!/^\d{3}(?: |$)/.test(lines[at])) continue;

    return {
      reply: {
        code: Number(lines[at].slice(0, 3)),
        text: lines
          .slice(0, at + 1)
          .join(' ')
          .trim(),
      },
      rest: lines.slice(at + 1).join(CRLF),
    };
  }

  return null;
}

function is(...codes: number[]): (code: number) => boolean {
  return (code) => codes.includes(code);
}

function base64(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64');
}

export function senderAddress(from: string): string {
  return from.replace(/.*<|>.*/g, '').trim();
}

function encodeHeader(value: string): string {
  return /^[\x20-\x7E]*$/.test(value) ? value : `=?UTF-8?B?${base64(value)}?=`;
}

export function dotStuff(body: string): string {
  return body
    .split(CRLF)
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join(CRLF);
}

export function buildMime(message: MailMessage, from: string): string {
  const boundary = `ts_${Date.now().toString(36)}`;

  return [
    `From: ${from}`,
    `To: ${message.to}`,
    `Subject: ${encodeHeader(message.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    message.text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    message.html,
    '',
    `--${boundary}--`,
    '',
  ].join(CRLF);
}

class SmtpSession {
  private stream: NodeJS.ReadWriteStream;
  private buffer = '';
  private waiting: {
    resolve(reply: SmtpReply): void;
    reject(error: Error): void;
  } | null = null;
  private arrived: SmtpReply[] = [];
  private failure: Error | null = null;

  constructor(private readonly socket: Socket) {
    this.stream = socket;
    this.listen(socket);
    socket.on('error', (error) => this.fail(error));
  }

  private listen(stream: NodeJS.ReadWriteStream): void {
    stream.on('data', (chunk: Buffer) => this.absorb(chunk.toString('utf8')));
  }

  private absorb(chunk: string): void {
    this.buffer += chunk;

    for (;;) {
      const taken = takeReply(this.buffer);
      if (!taken) return;

      this.buffer = taken.rest;

      const waiting = this.waiting;

      if (waiting) {
        this.waiting = null;
        waiting.resolve(taken.reply);
      } else {
        this.arrived.push(taken.reply);
      }
    }
  }

  private fail(error: Error): void {
    this.failure ??= error;

    const waiting = this.waiting;
    this.waiting = null;
    waiting?.reject(error);
  }

  private next(): Promise<SmtpReply> {
    if (this.failure) return Promise.reject(this.failure);

    const queued = this.arrived.shift();
    if (queued) return Promise.resolve(queued);

    return new Promise((resolve, reject) => {
      this.waiting = { resolve, reject };
    });
  }

  write(line: string): void {
    this.stream.write(line + CRLF);
  }

  async expect(
    accepted: (code: number) => boolean,
    step: string,
  ): Promise<SmtpReply> {
    const reply = await this.next();

    if (!accepted(reply.code)) {
      throw new Error(`SMTP ${step} was refused: ${reply.text.slice(0, 160)}`);
    }

    return reply;
  }

  async command(
    line: string,
    accepted: (code: number) => boolean,
    step: string,
  ): Promise<SmtpReply> {
    this.write(line);

    return this.expect(accepted, step);
  }

  async upgrade(): Promise<void> {
    this.socket.removeAllListeners('data');

    const secure: TLSSocket = tlsConnect({
      socket: this.socket,
      servername: mailConfig.host,
    });

    await new Promise<void>((resolve, reject) => {
      secure.once('secureConnect', resolve);
      secure.once('error', reject);
    });

    secure.removeAllListeners('error');
    secure.on('error', (error: Error) => this.fail(error));

    this.buffer = '';
    this.stream = secure;
    this.listen(secure);
  }

  abort(error: Error): void {
    this.fail(error);
    this.socket.destroy();
  }

  close(): void {
    this.socket.destroy();
  }
}

export async function smtpSend(message: MailMessage): Promise<void> {
  const implicitTls = mailConfig.port === IMPLICIT_TLS_PORT;

  const socket = implicitTls
    ? tlsConnect({
        host: mailConfig.host,
        port: mailConfig.port,
        servername: mailConfig.host,
      })
    : netConnect({ host: mailConfig.host, port: mailConfig.port });

  const session = new SmtpSession(socket);

  const timer = setTimeout(
    () => session.abort(new Error('SMTP timed out')),
    mailConfig.timeoutMs,
  );

  try {
    await session.expect(is(220), 'greeting');
    await session.command(`EHLO ${mailConfig.helo}`, is(250), 'EHLO');

    if (!implicitTls) {
      await session.command('STARTTLS', is(220), 'STARTTLS');
      await session.upgrade();
      await session.command(`EHLO ${mailConfig.helo}`, is(250), 'EHLO');
    }

    if (mailConfig.user) {
      await session.command('AUTH LOGIN', is(334), 'AUTH LOGIN');
      await session.command(base64(mailConfig.user), is(334), 'username');
      await session.command(base64(mailConfig.password), is(235), 'password');
    }

    const from = mailConfig.from;

    await session.command(
      `MAIL FROM:<${senderAddress(from)}>`,
      is(250, 251),
      'MAIL FROM',
    );
    await session.command(`RCPT TO:<${message.to}>`, is(250, 251), 'RCPT TO');
    await session.command('DATA', is(354), 'DATA');
    await session.command(
      `${dotStuff(buildMime(message, from))}${CRLF}.`,
      is(250),
      'message body',
    );

    session.write('QUIT');
  } finally {
    clearTimeout(timer);
    session.close();
  }
}
