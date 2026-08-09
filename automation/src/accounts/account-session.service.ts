import { Injectable, Logger } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { SecurityPolicy } from '../shared/config/policies';
import {
  IDENTITY_COOKIE,
  IDENTITY_ISSUER,
  IdentityClaims,
  identityCookieDomain,
  identitySecretConfigured,
  issueIdentity,
  readIdentity,
} from '../shared/identity/identity';
import { Account } from './account.model';

@Injectable()
export class AccountSessionService {
  static readonly COOKIE = IDENTITY_COOKIE;

  private readonly logger = new Logger(AccountSessionService.name);

  constructor() {
    if (!identitySecretConfigured()) {
      this.logger.warn(
        'AUTH_SECRET is unset or under 32 characters, so sessions are signed with a ' +
          'built-in development key. Single sign-on with the other apps will not work ' +
          'until both are given the same AUTH_SECRET.',
      );
    }
  }

  get cookieMaxAge(): number {
    return SecurityPolicy.sessionMs;
  }

  private options(req: Request): CookieOptions {
    const domain = identityCookieDomain();

    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.secure,
      path: '/',
      ...(domain ? { domain } : {}),
    };
  }

  /** Mint a session for one of our own accounts and put it on the response. */
  start(req: Request, res: Response, account: Account): void {
    const token = issueIdentity({
      email: account.email,
      name: account.name,
      sv: account.tokenVersion ?? 0,
      maxAgeMs: this.cookieMaxAge,
    });

    res.cookie(IDENTITY_COOKIE, token, {
      ...this.options(req),
      maxAge: this.cookieMaxAge,
    });
  }

  clear(req: Request, res: Response): void {
    res.clearCookie(IDENTITY_COOKIE, this.options(req));
  }

  /** The claims on the request, if it carries a session any of our apps signed. */
  claims(req: Request): IdentityClaims | null {
    const cookies = (req.cookies ?? {}) as Record<string, string>;

    return readIdentity(cookies[IDENTITY_COOKIE]);
  }

  /**
   * Whether the session was minted here. Ours can be checked against the local
   * token version; another app's cannot, because we do not hold the record
   * that number counts against.
   */
  isOurs(claims: IdentityClaims): boolean {
    return claims.iss === IDENTITY_ISSUER;
  }
}
