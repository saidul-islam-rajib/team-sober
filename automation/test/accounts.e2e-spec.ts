import request from 'supertest';
import {
  AUTH_SECRET,
  LEARNER_PASSWORD,
  sessionCookieFrom,
  setupLinkFrom,
  useTestApp,
} from './helpers/harness';
import {
  IDENTITY_COOKIE,
  issueIdentity,
  readIdentity,
} from '../src/shared/identity/identity';

const ctx = useTestApp();

const NAME = 'Saidul Islam Rajib';
const EMAIL = 'rajib@example.com';
const PASSWORD = LEARNER_PASSWORD;

const cookiesFrom = (res: request.Response): string[] =>
  (res.headers['set-cookie'] as unknown as string[]) ?? [];

const sessionFrom = sessionCookieFrom;

const tokenIn = (cookie: string): string =>
  decodeURIComponent(cookie.split(';')[0].split('=')[1] ?? '');

const linkFrom = setupLinkFrom;

const pathOf = (link: string): string => link.replace(/^https?:\/\/[^/]+/, '');

const issuedCodeFrom = (html: string): string =>
  /id="issued-code"[^>]*>([^<]+)</.exec(html)?.[1].trim() ?? '';

const register = (extra: Record<string, string> = {}) =>
  request(ctx.server)
    .post('/account/register')
    .type('form')
    .send({ name: NAME, email: EMAIL, ...extra });

const signIn = (password: string, email = EMAIL) =>
  request(ctx.server)
    .post('/account/sign-in')
    .type('form')
    .send({ email, password });

/** Register, follow the emailed link and choose a password. */
const onboard = async (
  extra: Record<string, string> = {},
): Promise<{ link: string; session: string }> => {
  const link = linkFrom((await register(extra).expect(200)).text);
  const token = new URL(link).searchParams.get('token') ?? '';

  const res = await request(ctx.server)
    .post('/account/set-password')
    .type('form')
    .send({ token, password: PASSWORD })
    .expect(302);

  return { link, session: sessionFrom(res) };
};

describe('registering', () => {
  it('asks for a name and an address but not a password', () =>
    request(ctx.server)
      .get('/account/register')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Create an account');
        expect(res.text).toContain('name="email"');
        expect(res.text).not.toContain('name="password"');
      }));

  it('emails a link instead of signing anybody in', async () => {
    const res = await register().expect(200);

    expect(res.text).toContain('Check your email');
    expect(sessionFrom(res)).toBe('');
    expect(linkFrom(res.text)).toContain('/account/set-password?token=');
  });

  it('rejects a malformed email without creating anything', async () => {
    await register({ email: 'nope' })
      .expect(200)
      .expect((res) => expect(res.text).toContain('email'));

    await signIn(PASSWORD, 'nope')
      .expect(200)
      .expect((res) => expect(res.text).toContain('did not match'));
  });

  it('requires a name', () =>
    register({ name: '  ' })
      .expect(200)
      .expect((res) => expect(res.text).toContain('name')));

  it('will not let anybody sign in before the link is followed', async () => {
    await register().expect(200);

    await signIn(PASSWORD)
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('did not match');
        expect(sessionFrom(res)).toBe('');
      });
  });

  it('says exactly the same thing for an address that is already registered', async () => {
    await onboard();

    const again = await register().expect(200);

    // No hint that this address is taken, and no new link issued.
    expect(again.text).toContain('Check your email');
    expect(again.text).not.toContain('already');
    expect(linkFrom(again.text)).toBe('');
  });

  it('re-sends while the first link is still unused, without duplicating', async () => {
    const first = linkFrom((await register().expect(200)).text);
    const second = linkFrom((await register().expect(200)).text);

    expect(second).not.toBe(first);

    // The superseded link is dead; only the newest works.
    await request(ctx.server)
      .get(pathOf(first))
      .expect(200)
      .expect((res) => expect(res.text).toContain('will not work'));

    await request(ctx.server)
      .get(pathOf(second))
      .expect(200)
      .expect((res) => expect(res.text).toContain('Choose your password'));
  });
});

describe('choosing a password from the link', () => {
  it('shows the form for a live link', async () => {
    const link = linkFrom((await register().expect(200)).text);

    await request(ctx.server)
      .get(pathOf(link))
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Choose your password');
        expect(res.text).toContain(NAME);
        expect(res.text).toContain('name="password"');
      });
  });

  it('sets the password and signs the learner straight in', async () => {
    const { session } = await onboard();

    expect(session).toContain(IDENTITY_COOKIE);
    expect(session).toContain('HttpOnly');

    await request(ctx.server)
      .get('/account')
      .set('Cookie', session)
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain(NAME);
        expect(res.text).toContain(EMAIL);
      });
  });

  it('lets that password sign in afterwards', async () => {
    await onboard();

    const res = await signIn(PASSWORD).expect(302);

    expect(sessionFrom(res)).toContain(IDENTITY_COOKIE);
  });

  it('refuses a short password and keeps the link usable', async () => {
    const link = linkFrom((await register().expect(200)).text);
    const token = new URL(link).searchParams.get('token') ?? '';

    await request(ctx.server)
      .post('/account/set-password')
      .type('form')
      .send({ token, password: 'short' })
      .expect(200)
      .expect((res) => expect(res.text).toContain('at least'));

    await request(ctx.server)
      .post('/account/set-password')
      .type('form')
      .send({ token, password: PASSWORD })
      .expect(302);
  });

  it('will not spend the same link twice', async () => {
    const { link } = await onboard();
    const token = new URL(link).searchParams.get('token') ?? '';

    await request(ctx.server)
      .post('/account/set-password')
      .type('form')
      .send({ token, password: 'a-second-attempt' })
      .expect(200)
      .expect((res) => expect(res.text).toContain('already been used'));

    // The password from the first use is the one that still works.
    await signIn(PASSWORD).expect(302);
  });

  it('turns a token nobody issued away', () =>
    request(ctx.server)
      .get('/account/set-password?token=' + 'x'.repeat(43))
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('will not work');
        expect(res.text).toContain('not valid');
      }));

  it('carries a relative next target through the email', async () => {
    const { session } = await onboard({ next: '/tutorials/networking' });

    expect(session).toBeTruthy();

    const link = linkFrom(
      (
        await register({
          email: 'other@example.com',
          next: '/tutorials/networking',
        }).expect(200)
      ).text,
    );

    expect(link).toContain('next=%2Ftutorials%2Fnetworking');
  });

  it('refuses to be redirected off-site', async () => {
    const link = linkFrom(
      (await register({ next: 'https://evil.example/steal' }).expect(200)).text,
    );

    expect(link).not.toContain('evil.example');

    const token = new URL(link).searchParams.get('token') ?? '';

    await request(ctx.server)
      .post('/account/set-password')
      .type('form')
      .send({ token, password: PASSWORD, next: 'https://evil.example/steal' })
      .expect(302)
      .expect('Location', '/account');
  });
});

describe('signing in', () => {
  it('refuses the wrong password without setting a cookie', async () => {
    await onboard();

    await signIn('wrong')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('did not match');
        expect(sessionFrom(res)).toBe('');
      });
  });

  it('gives the same answer for an address that does not exist', () =>
    signIn(PASSWORD, 'nobody@example.com')
      .expect(200)
      .expect((res) => expect(res.text).toContain('did not match')));

  it('sends a signed-out visitor to sign in', () =>
    request(ctx.server)
      .get('/account')
      .expect(302)
      .expect('Location', '/account/sign-in'));

  it('refuses a forged session cookie', () =>
    request(ctx.server)
      .get('/account')
      .set('Cookie', `${IDENTITY_COOKIE}=not.a.real.token`)
      .expect(302)
      .expect('Location', '/account/sign-in'));

  it('signs out again', async () => {
    const { session } = await onboard();

    const res = await request(ctx.server)
      .post('/account/sign-out')
      .set('Cookie', session)
      .expect(302);

    expect(cookiesFrom(res).join(';')).toContain(IDENTITY_COOKIE);

    await request(ctx.server)
      .get('/account')
      .expect(302)
      .expect('Location', '/account/sign-in');
  });

  it('links to the forgotten-password page', () =>
    request(ctx.server)
      .get('/account/sign-in')
      .expect(200)
      .expect((res) => expect(res.text).toContain('/account/recover')));
});

describe('sign-in rate limiting', () => {
  it('locks out after repeated wrong passwords', async () => {
    await onboard();

    for (let i = 0; i < 5; i += 1) await signIn('wrong').expect(200);

    await signIn('wrong')
      .expect(200)
      .expect((res) => expect(res.text).toContain('Too many attempts'));
  });

  it('refuses even the right password while locked out', async () => {
    await onboard();

    for (let i = 0; i < 5; i += 1) await signIn('wrong').expect(200);

    await signIn(PASSWORD)
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Too many attempts');
        expect(sessionFrom(res)).toBe('');
      });
  });

  it('lets a correct password through before the limit', async () => {
    await onboard();

    await signIn('wrong').expect(200);
    await signIn(PASSWORD).expect(302);
  });
});

describe('forgotten passwords', () => {
  it('serves a form that asks only for the address', () =>
    request(ctx.server)
      .get('/account/recover')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Forgotten your password?');
        expect(res.text).toContain('name="email"');
        expect(res.text).not.toContain('name="code"');
      }));

  it('emails a link that sets a new password and signs the learner in', async () => {
    await onboard();

    const asked = await request(ctx.server)
      .post('/account/recover')
      .type('form')
      .send({ email: EMAIL })
      .expect(200);

    expect(asked.text).toContain('Check your email');

    const token = new URL(linkFrom(asked.text)).searchParams.get('token') ?? '';

    const res = await request(ctx.server)
      .post('/account/set-password')
      .type('form')
      .send({ token, password: 'a-brand-new-password' })
      .expect(302);

    expect(sessionFrom(res)).toContain(IDENTITY_COOKIE);

    await signIn('a-brand-new-password').expect(302);
  });

  it('leaves the old password working until the link is used', async () => {
    await onboard();

    await request(ctx.server)
      .post('/account/recover')
      .type('form')
      .send({ email: EMAIL })
      .expect(200);

    await signIn(PASSWORD).expect(302);
  });

  it('retires every existing session when the password changes', async () => {
    const { session } = await onboard();

    const asked = await request(ctx.server)
      .post('/account/recover')
      .type('form')
      .send({ email: EMAIL })
      .expect(200);

    const token = new URL(linkFrom(asked.text)).searchParams.get('token') ?? '';

    await request(ctx.server)
      .post('/account/set-password')
      .type('form')
      .send({ token, password: 'a-brand-new-password' })
      .expect(302);

    // The cookie from before the reset carries the old token version.
    await request(ctx.server)
      .get('/account')
      .set('Cookie', session)
      .expect(302)
      .expect('Location', '/account/sign-in');
  });

  it('does not reveal whether an address has an account', async () => {
    await onboard();

    const known = await request(ctx.server)
      .post('/account/recover')
      .type('form')
      .send({ email: EMAIL })
      .expect(200);

    const unknown = await request(ctx.server)
      .post('/account/recover')
      .type('form')
      .send({ email: 'nobody@example.com' })
      .expect(200);

    expect(known.text).toContain('Check your email');
    expect(unknown.text).toContain('Check your email');
    expect(unknown.text).toContain('nobody@example.com');
  });

  it('still tells somebody who has lost the mailbox where to turn', () =>
    request(ctx.server)
      .get('/account/recover')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Lost the address as well?');
        expect(res.text).toContain('/account/recover-request');
      }));
});

describe('single sign-on across the Team Sober services', () => {
  const fromSibling = (over: Record<string, unknown> = {}): string =>
    issueIdentity({
      email: 'shared@example.com',
      name: 'Shared Account',
      sv: 7,
      maxAgeMs: 60 * 60 * 1000,
      issuer: 'bachelor-point',
      ...over,
    });

  const cookie = (token: string) => `${IDENTITY_COOKIE}=${token}`;

  it('lets somebody who registered on another service straight in', () =>
    request(ctx.server)
      .get('/account')
      .set('Cookie', cookie(fromSibling()))
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Shared Account');
        expect(res.text).toContain('shared@example.com');
      }));

  it('creates the local account once and reuses it after that', async () => {
    const jar = cookie(fromSibling());

    await request(ctx.server).get('/account').set('Cookie', jar).expect(200);
    await request(ctx.server).get('/account').set('Cookie', jar).expect(200);

    const admin = await ctx.signIn();

    const listed = await request(ctx.server)
      .get('/admin/accounts?q=shared@example.com')
      .set('Cookie', admin)
      .expect(200);

    // One row, not one per visit.
    expect(listed.text.match(/href="\/admin\/accounts\/[^"]+"/g)).toHaveLength(
      1,
    );
  });

  it('offers to set a local password, since there is not one yet', () =>
    request(ctx.server)
      .get('/account')
      .set('Cookie', cookie(fromSibling()))
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('no password on this account yet');
        expect(res.text).toContain('action="/account/password-link"');
      }));

  it('joins up with an account that already exists here', async () => {
    await onboard();

    await request(ctx.server)
      .get('/account')
      .set('Cookie', cookie(fromSibling({ email: EMAIL })))
      .expect(200)
      .expect((res) => expect(res.text).toContain(EMAIL));

    const admin = await ctx.signIn();

    const listed = await request(ctx.server)
      .get('/admin/accounts')
      .set('Cookie', admin)
      .expect(200);

    expect(listed.text.match(/rajib@example\.com/g)).toHaveLength(1);
  });

  it('refuses a session signed with a different secret', async () => {
    const token = fromSibling();

    process.env.AUTH_SECRET = 'a-completely-different-secret-of-good-length';

    try {
      await request(ctx.server)
        .get('/account')
        .set('Cookie', cookie(token))
        .expect(302)
        .expect('Location', '/account/sign-in');
    } finally {
      process.env.AUTH_SECRET = AUTH_SECRET;
    }
  });

  it('refuses a session that has expired', () =>
    request(ctx.server)
      .get('/account')
      .set('Cookie', cookie(fromSibling({ maxAgeMs: -1000 })))
      .expect(302)
      .expect('Location', '/account/sign-in'));

  it('mints a session the other services can read', async () => {
    const { session } = await onboard();
    const claims = readIdentity(tokenIn(session));

    expect(claims).toBeTruthy();
    expect(claims?.iss).toBe('team-sober');
    expect(claims?.email).toBe(EMAIL);
    expect(claims?.name).toBe(NAME);
  });

  it('scopes the cookie to the parent domain when one is configured', async () => {
    process.env.SSO_COOKIE_DOMAIN = '.team-sober.com';

    try {
      await register({ email: 'domain@example.com' }).expect(200);
      const { session } = await onboard({ email: 'domain@example.com' });

      expect(session).toContain('Domain=.team-sober.com');
    } finally {
      delete process.env.SSO_COOKIE_DOMAIN;
    }
  });
});

describe('managing your own password', () => {
  it('emails a link rather than asking for the old password', async () => {
    const { session } = await onboard();

    await request(ctx.server)
      .post('/account/password-link')
      .set('Cookie', session)
      .expect(200)
      .expect((res) => expect(res.text).toContain('A link is on its way'));
  });

  it('sends a signed-out visitor to sign in instead', () =>
    request(ctx.server)
      .post('/account/password-link')
      .expect(302)
      .expect('Location', '/account/sign-in'));
});

describe('resets the owner issues by hand', () => {
  const accountId = async (admin: string): Promise<string> => {
    const res = await request(ctx.server)
      .get('/admin/accounts')
      .set('Cookie', admin)
      .expect(200);

    return /href="\/admin\/accounts\/([^"]+)"/.exec(res.text)?.[1] ?? '';
  };

  const issue = async (
    admin: string,
    note = 'Replied from the address on the account',
  ): Promise<string> => {
    const id = await accountId(admin);

    const res = await request(ctx.server)
      .post(`/admin/accounts/${id}/reset`)
      .set('Cookie', admin)
      .type('form')
      .send({ note })
      .expect(200);

    return issuedCodeFrom(res.text);
  };

  it('keeps the account list behind the admin sign-in', () =>
    request(ctx.server)
      .get('/admin/accounts')
      .expect(302)
      .expect('Location', '/login'));

  it('lists the learners who have registered', async () => {
    await onboard();
    const admin = await ctx.signIn();

    await request(ctx.server)
      .get('/admin/accounts')
      .set('Cookie', admin)
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain(NAME);
        expect(res.text).toContain(EMAIL);
      });
  });

  it('will not issue a reset without a record of the check', async () => {
    await onboard();
    const admin = await ctx.signIn();
    const id = await accountId(admin);

    await request(ctx.server)
      .post(`/admin/accounts/${id}/reset`)
      .set('Cookie', admin)
      .type('form')
      .send({ note: '   ' })
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('how you checked');
        expect(issuedCodeFrom(res.text)).toBe('');
      });
  });

  it('shows the code once, with a link the learner can follow', async () => {
    await onboard();
    const admin = await ctx.signIn();
    const id = await accountId(admin);

    const issued = await request(ctx.server)
      .post(`/admin/accounts/${id}/reset`)
      .set('Cookie', admin)
      .type('form')
      .send({ note: 'Replied from the address on the account' })
      .expect(200);

    expect(issuedCodeFrom(issued.text)).toBeTruthy();
    expect(issued.text).toContain('/account/reset?code=');

    await request(ctx.server)
      .get(`/admin/accounts/${id}`)
      .set('Cookie', admin)
      .expect(200)
      .expect((res) => expect(issuedCodeFrom(res.text)).toBe(''));
  });

  it('sets a new password and signs the learner in', async () => {
    await onboard();
    const code = await issue(await ctx.signIn());

    const res = await request(ctx.server)
      .post('/account/reset')
      .type('form')
      .send({ email: EMAIL, code, password: 'chosen-by-the-learner' })
      .expect(302);

    expect(sessionFrom(res)).toContain(IDENTITY_COOKIE);

    await signIn('chosen-by-the-learner').expect(302);
  });

  it('prefills the code from the link', async () => {
    await onboard();
    const code = await issue(await ctx.signIn());

    await request(ctx.server)
      .get(`/account/reset?code=${code}`)
      .expect(200)
      .expect((res) => expect(res.text).toContain(`value="${code}"`));
  });

  it('will not spend the same code twice', async () => {
    await onboard();
    const code = await issue(await ctx.signIn());

    const spend = (password: string) =>
      request(ctx.server)
        .post('/account/reset')
        .type('form')
        .send({ email: EMAIL, code, password });

    await spend('chosen-by-the-learner').expect(302);

    await spend('a-second-go')
      .expect(200)
      .expect((res) => expect(res.text).toContain('did not match'));
  });

  it('cancels an outstanding code on request', async () => {
    await onboard();
    const admin = await ctx.signIn();

    const code = await issue(admin);
    const id = await accountId(admin);

    await request(ctx.server)
      .post(`/admin/accounts/${id}/revoke`)
      .set('Cookie', admin)
      .expect(302)
      .expect('Location', `/admin/accounts/${id}?ok=revoked`);

    await request(ctx.server)
      .post('/account/reset')
      .type('form')
      .send({ email: EMAIL, code, password: 'too-late-now' })
      .expect(200)
      .expect((res) => expect(res.text).toContain('did not match'));
  });

  it('does not reveal whether an address has an account', async () => {
    await onboard();

    const unknown = await request(ctx.server)
      .post('/account/reset')
      .type('form')
      .send({
        email: 'nobody@example.com',
        code: 'AAAAA-AAAAA-AAAAA-AAAAA',
        password: 'a-brand-new-password',
      })
      .expect(200);

    const known = await request(ctx.server)
      .post('/account/reset')
      .type('form')
      .send({
        email: EMAIL,
        code: 'AAAAA-AAAAA-AAAAA-AAAAA',
        password: 'a-brand-new-password',
      })
      .expect(200);

    expect(unknown.text).toContain('did not match');
    expect(known.text).toContain('did not match');
  });
});
