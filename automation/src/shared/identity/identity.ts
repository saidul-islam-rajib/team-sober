import { createHash, createHmac, timingSafeEqual } from 'crypto';

/**
 * The cross-application session.
 *
 * Team Sober and Bachelor Point run as separate applications with separate
 * stores, but both are served from `*.team-sober.com`. A cookie set on the
 * parent domain is therefore visible to both, and if both sign it with the
 * same `AUTH_SECRET` then either can verify a session the other minted. That
 * is the whole of the single sign-on: no redirects, no authorisation codes,
 * and no service that has to be reachable for the other one to log anybody in.
 *
 * Two rules make it safe to consume a token you did not mint:
 *
 *   - `sub` is derived from the address rather than allocated, so the same
 *     person has the same identifier everywhere without the apps ever having
 *     to agree on one.
 *   - `sv` is the *issuer's* token version. Only the issuer holds the record
 *     it has to be checked against, so a consumer ignores it and re-checks the
 *     account against its own copy instead.
 */

export const IDENTITY_COOKIE = 'ts_identity';

export const IDENTITY_ISSUER = 'team-sober';

/** Namespaced so a hash of an address here cannot be replayed anywhere else. */
const SUBJECT_NAMESPACE = 'team-sober.com/identity/v1';

const DEV_FALLBACK_SECRET =
  'team-sober-insecure-development-secret-do-not-use-in-production';

const MIN_SECRET_LENGTH = 32;

export interface IdentityClaims {
  /** Stable across every app, derived from the email address. */
  sub: string;
  email: string;
  name: string;
  /** Which application minted this token. */
  iss: string;
  /** The issuer's token version, for revoking its own sessions. */
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

/**
 * The `Domain` for the session cookie — `.team-sober.com` in production, so
 * both apps see it. Unset locally, which makes the cookie host-only and keeps
 * a development session from leaking between ports.
 */
export function identityCookieDomain(): string {
  return (process.env.SSO_COOKIE_DOMAIN ?? '').trim();
}

/**
 * The same address always yields the same subject, in any app, with no shared
 * table to look it up in. Shaped like a UUID so it reads like an id.
 */
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
