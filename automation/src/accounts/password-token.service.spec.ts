import { createHash } from 'crypto';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PasswordTokenService } from './password-token.service';
import { TokenPurpose } from './password-token.model';
import { AccountPolicy } from '../shared/config/policies';

const ACCOUNT = 'account-1';
const AFTER_EXPIRY = AccountPolicy.passwordLinkMs + 1000;

describe('PasswordTokenService', () => {
  let dir: string;
  let service: PasswordTokenService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tokens-test-'));
    process.env.DATA_DIR = dir;
    service = new PasswordTokenService();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  const issue = (purpose = TokenPurpose.Setup) =>
    service.issue(ACCOUNT, purpose, '203.0.113.1').token;

  it('hands back a long, URL-safe token', () => {
    const token = issue();

    expect(token.length).toBeGreaterThan(30);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('never stores the token itself, only its hash', () => {
    const token = issue();
    const lookup = service.find(token);

    expect(lookup.ok).toBe(true);
    if (!lookup.ok) return;

    expect(lookup.token.tokenHash).not.toContain(token);
    expect(lookup.token.tokenHash).toBe(
      createHash('sha256').update(token).digest('hex'),
    );
  });

  it('finds the account and purpose the link was cut for', () => {
    const lookup = service.find(issue(TokenPurpose.Reset));

    expect(lookup.ok).toBe(true);
    if (!lookup.ok) return;

    expect(lookup.token.accountId).toBe(ACCOUNT);
    expect(lookup.token.purpose).toBe(TokenPurpose.Reset);
    expect(lookup.token.requestedIp).toBe('203.0.113.1');
  });

  it('works once and says so the second time', () => {
    const token = issue();
    const first = service.find(token);

    expect(first.ok).toBe(true);
    if (!first.ok) return;

    service.consume(first.token.id);

    const second = service.find(token);

    expect(second.ok).toBe(false);
    if (second.ok) return;

    expect(second.problem).toContain('already been used');
  });

  it('expires', () => {
    const token = issue();

    expect(service.find(token).ok).toBe(true);

    const stale = service.find(token, Date.now() + AFTER_EXPIRY);

    expect(stale.ok).toBe(false);
    if (stale.ok) return;

    expect(stale.problem).toContain('expired');
  });

  it('refuses a token nobody issued', () => {
    const lookup = service.find('x'.repeat(43));

    expect(lookup.ok).toBe(false);
    if (lookup.ok) return;

    expect(lookup.problem).toContain('not valid');
  });

  it('refuses something too short to be one of ours without looking', () => {
    expect(service.find('short').ok).toBe(false);
    expect(service.find('').ok).toBe(false);
    expect(service.find(undefined).ok).toBe(false);
  });

  it('retires the previous link of the same purpose when another is asked for', () => {
    const first = issue();
    const second = issue();

    expect(service.find(first).ok).toBe(false);
    expect(service.find(second).ok).toBe(true);
  });

  it('leaves a link of a different purpose alone', () => {
    const setup = issue(TokenPurpose.Setup);
    const reset = issue(TokenPurpose.Reset);

    expect(service.find(setup).ok).toBe(true);
    expect(service.find(reset).ok).toBe(true);
  });

  it('does not touch another account’s links', () => {
    const mine = issue();
    service.issue('account-2', TokenPurpose.Setup);

    expect(service.find(mine).ok).toBe(true);
  });

  it('clears spent and expired links rather than growing without end', () => {
    const token = issue();
    const lookup = service.find(token);

    if (!lookup.ok) throw new Error('expected a live token');
    service.consume(lookup.token.id);

    expect(service.prune()).toBe(1);
    expect(service.count).toBe(0);
  });

  it('survives a restart', () => {
    const token = issue();

    expect(new PasswordTokenService().find(token).ok).toBe(true);
  });
});
