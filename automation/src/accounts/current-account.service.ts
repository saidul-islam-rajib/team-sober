import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AccountSessionService } from './account-session.service';
import { AccountsService } from './accounts.service';
import { Account } from './account.model';

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
      return this.accounts.provisionFromIdentity(claims);
    }

    const account = this.accounts.findByEmail(claims.email);
    if (!account) return undefined;

    return (account.tokenVersion ?? 0) === claims.sv ? account : undefined;
  }
}
