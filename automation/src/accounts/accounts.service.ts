import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JsonCollection } from '../shared/persistence/json-collection';
import { IDENTITY_ISSUER, IdentityClaims } from '../shared/identity/identity';
import { Account } from './account.model';
import { AccountStatus } from './account-status';
import { CredentialsInput, RegisterInput } from './account.dto';
import { normaliseEmail, normaliseName } from './account.rules';
import { needsRehash, seal, sealMatches } from './secret';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  private readonly store = new JsonCollection<Account>({
    file: 'accounts.json',
    key: 'accounts',
    label: 'account(s)',
  });

  findByEmail(email?: string): Account | undefined {
    const wanted = normaliseEmail(email);
    if (!wanted) return undefined;

    return this.store.find((account) => account.email === wanted);
  }

  findById(id?: string): Account | undefined {
    return id ? this.store.find((account) => account.id === id) : undefined;
  }

  taken(email?: string): boolean {
    return Boolean(this.findByEmail(email));
  }

  /** An account can only be signed into once a password has actually been set. */
  private usable(account: Account): boolean {
    return Boolean(account.secret) && account.status === AccountStatus.Active;
  }

  /**
   * Start a registration and return the account a setup link should be sent to.
   *
   * `null` means send nothing: the address already has a working password, and
   * saying so would confirm to a stranger that it is registered. The caller
   * shows the same "check your email" either way.
   */
  beginRegistration(input: RegisterInput): Account | null {
    const existing = this.findByEmail(input.email);

    if (existing) {
      if (this.usable(existing)) return null;

      // Still waiting on a first password — update the name and re-send.
      existing.name = normaliseName(input.name) || existing.name;
      existing.updatedAt = new Date().toISOString();
      this.store.persist();

      return existing;
    }

    const now = new Date().toISOString();

    return this.store.add({
      id: randomUUID(),
      name: normaliseName(input.name),
      email: normaliseEmail(input.email),
      secret: '',
      status: AccountStatus.Unverified,
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
      origin: IDENTITY_ISSUER,
    });
  }

  /**
   * Set or replace a password. Bumping the token version retires every session
   * this app has issued for the account, so a stolen one dies with the reset.
   */
  async setPassword(
    id: string,
    password: string,
  ): Promise<Account | undefined> {
    const account = this.findById(id);
    if (!account) return undefined;

    account.secret = await seal(password);
    account.status = AccountStatus.Active;
    account.tokenVersion = (account.tokenVersion ?? 0) + 1;
    account.updatedAt = new Date().toISOString();
    this.store.persist();

    return account;
  }

  async authenticate(input: CredentialsInput): Promise<Account | undefined> {
    const account = this.findByEmail(input.email);
    const password = input.password ?? '';

    if (!account || !this.usable(account)) return undefined;
    if (!(await sealMatches(account.secret, password))) return undefined;

    // The plaintext is in hand exactly here, so this is the one chance to
    // bring an older hash up to the current cost without asking anybody.
    if (needsRehash(account.secret)) {
      account.secret = await seal(password);
      this.store.persist();
    }

    return account;
  }

  /**
   * Adopt somebody who signed in on one of the sibling applications.
   *
   * Their address is already proven — the session carrying it is signed with
   * the secret only our own apps hold — so the local record is created active,
   * just without a local password. Setting one is a "forgot password" away.
   */
  provisionFromIdentity(claims: IdentityClaims): Account {
    const existing = this.findByEmail(claims.email);
    if (existing) return existing;

    const now = new Date().toISOString();

    this.logger.log(
      `Creating a local account for ${claims.email}, signed in via ${claims.iss}`,
    );

    return this.store.add({
      id: randomUUID(),
      name: normaliseName(claims.name) || claims.email,
      email: normaliseEmail(claims.email),
      secret: '',
      status: AccountStatus.Active,
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
      origin: claims.iss,
    });
  }

  list(query = ''): Account[] {
    const wanted = query.trim().toLowerCase();

    return this.store
      .filter(
        (account) =>
          !wanted ||
          account.email.includes(wanted) ||
          account.name.toLowerCase().includes(wanted),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get count(): number {
    return this.store.size;
  }
}
