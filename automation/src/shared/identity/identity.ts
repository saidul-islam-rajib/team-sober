import { createHash, createHmac, timingSafeEqual } from 'crypto';

export const IDENTITY_COOKIE = 'ts_identity';

export const IDENTITY_ISSUER = 'team-sober';

const SUBJECT_NAMESPACE = 'team-sober.com/identity/v1';

const DEV_FALLBACK_SECRET =
  'team-sober-insecure-development-secret-do-not-use-in-production';

const MIN_SECRET_LENGTH = 32;

export interface IdentityClaims {
  sub: string;
  email: string;
  name: string;
  iss: string;
  sv: number;
  iat: number;
  exp: number;
}

export function identitySecret(): string {
  const configured =
    process.env.AUTH_SECRET ?? process.env.SESSION_SECRET ?? '';

  return configured.length >= MIN_SECRET_LENGTH
    ? configured
    : DEV_FALLBACK_SECRET;
}

export function identitySecretConfigured(): boolean {
  return identitySecret() !== DEV_FALLBACK_SECRET;
}

export function identityCookieDomain(): string {
  return (process.env.SSO_COOKIE_DOMAIN ?? '').trim();
}

export function identityId(email: string): string {
  const digest = createHash('sha256')
    .update(`${SUBJECT_NAMESPACE}:${email.trim().toLowerCase()}`)
    .digest('hex');

  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    digest.slice(12, 16),
    digest.slice(16, 20),
    digest.slice(20, 32),
  ].join('-');
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

export interface IssueIdentityInput {
  sub?: string;
  email: string;
  name: string;
  sv: number;
  maxAgeMs: number;
  issuer?: string;
  now?: number;
}

export function issueIdentity(input: IssueIdentityInput): string {
  const issuedAt = Math.floor((input.now ?? Date.now()) / 1000);

  const claims: IdentityClaims = {
    sub: input.sub ?? identityId(input.email),
    email: input.email,
    name: input.name,
    iss: input.issuer ?? IDENTITY_ISSUER,
    sv: input.sv,
    iat: issuedAt,
    exp: issuedAt + Math.floor(input.maxAgeMs / 1000),
  };

  const body = encode(JSON.stringify(claims));

  return `${body}.${sign(body, identitySecret())}`;
}

function signatureMatches(body: string, signature: string): boolean {
  const expected = sign(body, identitySecret());
  if (signature.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function wellFormed(claims: Partial<IdentityClaims>): boolean {
  return (
    typeof claims.sub === 'string' &&
    Boolean(claims.sub) &&
    typeof claims.email === 'string' &&
    Boolean(claims.email) &&
    typeof claims.name === 'string' &&
    typeof claims.iss === 'string' &&
    Boolean(claims.iss) &&
    typeof claims.sv === 'number' &&
    typeof claims.iat === 'number' &&
    typeof claims.exp === 'number'
  );
}

export function readIdentity(
  token?: string,
  now = Date.now(),
): IdentityClaims | null {
  if (!token) return null;

  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;

  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  try {
    if (!signatureMatches(body, signature)) return null;

    const claims = JSON.parse(decode(body)) as Partial<IdentityClaims>;
    if (!wellFormed(claims)) return null;

    const full = claims as IdentityClaims;

    return full.exp > Math.floor(now / 1000) ? full : null;
  } catch {
    return null;
  }
}
