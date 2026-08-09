import { buildMime, dotStuff, senderAddress, takeReply } from './smtp.client';

const CRLF = '\r\n';

describe('takeReply', () => {
  it('waits until a line is complete', () => {
    expect(takeReply('250 OK')).toBeNull();
    expect(takeReply('')).toBeNull();
  });

  it('reads a single-line reply and its code', () => {
    const taken = takeReply(`220 smtp.example.com ready${CRLF}`);

    expect(taken?.reply.code).toBe(220);
    expect(taken?.rest).toBe('');
  });

  it('treats a multi-line reply as one reply', () => {
    const buffer = [
      '250-smtp.example.com at your service',
      '250-SIZE 35882577',
      '250 SMTPUTF8',
      '',
    ].join(CRLF);

    const taken = takeReply(buffer);

    expect(taken?.reply.code).toBe(250);
    expect(taken?.rest).toBe('');
  });

  it('leaves the start of the next reply in the buffer', () => {
    const taken = takeReply(`250 OK${CRLF}354 Go ahead`);

    expect(taken?.reply.code).toBe(250);
    expect(taken?.rest).toBe('354 Go ahead');
  });

  it('does not end on a continuation line', () => {
    expect(takeReply(`250-first${CRLF}`)).toBeNull();
  });

  it('accepts a closing line with no text after the code', () => {
    expect(takeReply(`250${CRLF}`)?.reply.code).toBe(250);
  });
});

describe('senderAddress', () => {
  it('takes the address out of a display-name From', () => {
    expect(senderAddress('Team Sober <hi@team-sober.com>')).toBe(
      'hi@team-sober.com',
    );
  });

  it('leaves a bare address alone', () => {
    expect(senderAddress('hi@team-sober.com')).toBe('hi@team-sober.com');
  });
});

describe('dotStuff', () => {
  it('doubles a leading dot so it cannot end the message early', () => {
    expect(dotStuff(`a${CRLF}.${CRLF}b`)).toBe(`a${CRLF}..${CRLF}b`);
  });

  it('handles a dot on the very first line', () => {
    expect(dotStuff('.hidden')).toBe('..hidden');
  });

  it('leaves a dot in the middle of a line alone', () => {
    expect(dotStuff('one.two')).toBe('one.two');
  });
});

describe('buildMime', () => {
  const message = {
    to: 'learner@example.com',
    subject: 'Set your password',
    text: 'plain body',
    html: '<p>rich body</p>',
  };

  it('carries both a plain-text and an HTML part', () => {
    const mime = buildMime(message, 'Team Sober <hi@team-sober.com>');

    expect(mime).toContain('Content-Type: multipart/alternative');
    expect(mime).toContain('plain body');
    expect(mime).toContain('<p>rich body</p>');
    expect(mime).toContain('To: learner@example.com');
  });

  it('separates headers from the body with a blank line', () => {
    const mime = buildMime(message, 'hi@team-sober.com');

    expect(mime.split(`${CRLF}${CRLF}`).length).toBeGreaterThan(1);
  });

  it('encodes a subject that is not plain ASCII', () => {
    const mime = buildMime({ ...message, subject: 'Café' }, 'hi@example.com');

    expect(mime).toContain('=?UTF-8?B?');
    expect(mime).not.toContain('Subject: Café');
  });
});
