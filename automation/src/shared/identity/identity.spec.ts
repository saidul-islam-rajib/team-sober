import {
  IDENTITY_ISSUER,
  identityId,
  issueIdentity,
  readIdentity,
} from './identity';

const SECRET = 'a-test-secret-that-is-long-enough-to-count';

const HOUR = 60 * 60 * 1000;

describe('the shared identity session', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.AUTH_SECRET;
    delete process.env.SSO_COOKIE_DOMAIN;
  });

  const issue = (over: Partial<Parameters<typeof issueIdentity>[0]> = {}) =>
    issueIdentity({
      email: 'rajib@example.com',
      name: 'Saidul Islam Rajib',
      sv: 2,
      maxAgeMs: HOUR,
      ...over,
    });

  it('reads back the claims it signed', () => {
    const claims = readIdentity(issue());

    expect(claims?.email).toBe('rajib@example.com');
    expect(claims?.name).toBe('Saidul Islam Rajib');
    expect(claims?.sv).toBe(2);
    expect(claims?.iss).toBe(IDENTITY_ISSUER);
  });

  it('derives the same subject for an address in any application', () => {
    const here = readIdentity(issue())?.sub;
    const elsewhere = readIdentity(issue({ issuer: 'bachelor-point' }))?.sub;

    expect(here).toBe(identityId('rajib@example.com'));
    expect(here).toBe(elsewhere);
  });

  it('is case and whitespace insensitive about the address', () => {
    expect(identityId('  Rajib@Example.COM ')).toBe(
      identityId('rajib@example.com'),
    );
  });

  it('gives different addresses different subjects', () => {
    expect(identityId('a@example.com')).not.toBe(identityId('b@example.com'));
  });

  it('accepts a session another application signed with the same secret', () => {
    const claims = readIdentity(issue({ issuer: 'bachelor-point' }));

    expect(claims?.iss).toBe('bachelor-point');
    expect(claims?.email).toBe('rajib@example.com');
  });

  it('rejects tampered claims', () => {
    const token = issue();
    const [, signature] = token.split('.');

    const forged = Buffer.from(
      JSON.stringify({
        sub: identityId('victim@example.com'),
        email: 'victim@example.com',
        name: 'Victim',
        iss: IDENTITY_ISSUER,
        sv: 0,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
      'utf8',
    ).toString('base64url');

    expect(readIdentity(`${forged}.${signature}`)).toBeNull();
  });

  it('rejects a malformed or missing token', () => {
    expect(readIdentity('')).toBeNull();
    expect(readIdentity(undefined)).toBeNull();
    expect(readIdentity('nonsense')).toBeNull();
    expect(readIdentity('a.b')).toBeNull();
    expect(readIdentity('.signature')).toBeNull();
  });

  it('rejects a token signed with another secret', () => {
    const token = issue();

    process.env.AUTH_SECRET = 'a-completely-different-secret-of-good-length';

    expect(readIdentity(token)).toBeNull();
  });

  it('rejects a token that has expired', () => {
    const token = issue({ maxAgeMs: HOUR });

    expect(readIdentity(token, Date.now() + 2 * HOUR)).toBeNull();
  });
});
