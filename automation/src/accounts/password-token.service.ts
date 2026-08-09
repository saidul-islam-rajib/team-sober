import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { JsonCollection } from '../shared/persistence/json-collection';
import { AccountPolicy } from '../shared/config/policies';
import {
  PasswordToken,
  TOKEN_PROBLEMS,
  TokenPurpose,
  TokenState,
  UNKNOWN_TOKEN,
  tokenState,
} from './password-token.model';

const TOKEN_BYTES = 32;

const MIN_TOKEN_LENGTH = 20;

export type TokenLookup =
  { ok: true; token: PasswordToken } | { ok: false; problem: string };

@Injectable()
export class PasswordTokenService {
  private readonly logger = new Logger(PasswordTokenService.name);

  private readonly store = new JsonCollection<PasswordToken>({
    file: 'password-tokens.json',
    key: 'tokens',
    label: 'password link(s)',
  });

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  issue(
    accountId: string,
    purpose: TokenPurpose,
    requestedIp = '',
  ): { token: string; expiresAt: string } {
    this.revokeOutstanding(accountId, purpose);

    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const now = Date.now();
    const expiresAt = new Date(
      now + AccountPolicy.passwordLinkMs,
    ).toISOString();

    this.store.add({
      id: randomUUID(),
      accountId,
      tokenHash: this.hash(token),
      purpose,
      issuedAt: new Date(now).toISOString(),
      expiresAt,
      usedAt: '',
      requestedIp,
    });

    this.prune();

    return { token, expiresAt };
  }

  find(token?: string, now = Date.now()): TokenLookup {
    if (!token || token.length < MIN_TOKEN_LENGTH) {
      return { ok: false, problem: UNKNOWN_TOKEN };
    }

    const hash = this.hash(token);
    const found = this.store.find((record) => record.tokenHash === hash);

    if (!found) return { ok: false, problem: UNKNOWN_TOKEN };

    const state = tokenState(found, now);

    return state === TokenState.Live
      ? { ok: true, token: found }
      : { ok: false, problem: TOKEN_PROBLEMS[state] };
  }

  consume(id: string): void {
    const found = this.store.find((record) => record.id === id);
    if (!found || found.usedAt) return;

    found.usedAt = new Date().toISOString();
    this.store.persist();
  }

  revokeOutstanding(accountId: string, purpose: TokenPurpose): void {
    const now = new Date().toISOString();
    let changed = false;

    for (const record of this.store.all()) {
      const outstanding =
        record.accountId === accountId &&
        record.purpose === purpose &&
        !record.usedAt;

      if (!outstanding) continue;

      record.usedAt = now;
      changed = true;
    }

    if (changed) this.store.persist();
  }

  prune(now = Date.now()): number {
    const keep = this.store
      .all()
      .filter((record) => tokenState(record, now) === TokenState.Live);

    const dropped = this.store.size - keep.length;
    if (dropped > 0) {
      this.store.replaceAll(keep);
      this.logger.log(`Cleared ${dropped} spent password link(s)`);
    }

    return dropped;
  }

  get count(): number {
    return this.store.size;
  }
}
