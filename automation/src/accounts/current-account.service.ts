import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AccountSessionService } from './account-session.service';
import { AccountsService } from './accounts.service';
import { Account } from './account.model';

/**
 * Turns the session cookie on a request into a local account.
 *
 * The one place that decides what a session from a *sibling* application means
 * here, so every controller gets the same answer.
 */
@Injectable()
export class CurrentAccountService {
  constructor(
    private readonly accounts: AccountsService,
    private readonly session: AccountSessionService,
  ) {}

  resolve(req: Request): Account | undefined {
    const claims = this.session.claims(req);
    if (!claims) return undefined;

    if (!this.session.isOurs(claims)) {
      // Another of our apps signed this, so the address is proven. We hold no
      // record its token version counts against, so there is nothing further
      // to check — adopt the learner and let them in.
      return this.accounts.provisionFromIdentity(claims);
    }

    const account = this.accounts.findByEmail(claims.email);
    if (!account) return undefined;

    // Our own session, so the version must still match: a password change
    // bumps it and every cookie issued before that stops working.
    return (account.tokenVersion ?? 0) === claims.sv ? account : undefined;
  }
}
