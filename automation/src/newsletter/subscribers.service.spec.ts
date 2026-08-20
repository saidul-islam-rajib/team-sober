import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { NewsletterPolicy } from '../shared/config/policies';
import { SubscribersService } from './subscribers.service';
import { SubscriberStatus } from './subscriber.model';

describe('SubscribersService', () => {
  let dir: string;
  let service: SubscribersService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'subscribers-test-'));
    process.env.DATA_DIR = dir;
    service = new SubscribersService();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  it('starts a new subscription as pending and hands back a confirm token', () => {
    const outcome = service.subscribe('New@Example.com');

    expect('token' in outcome).toBe(true);
    expect(service.stats()).toEqual({
      pending: 1,
      confirmed: 0,
      unsubscribed: 0,
    });
  });

  it('normalises the email to lowercase and trims it', () => {
    service.subscribe('  Mixed@Example.com  ');

    expect(service.all()[0].email).toBe('mixed@example.com');
  });

  it('confirms a pending subscription with its token', () => {
    const outcome = service.subscribe('a@example.com');
    if (!('token' in outcome)) throw new Error('expected a token');

    const result = service.confirm(outcome.token);

    expect(result.ok).toBe(true);
    expect(service.stats().confirmed).toBe(1);
    if (result.ok) expect(result.unsubscribeToken.length).toBeGreaterThan(10);
  });

  it('rejects an unknown or already-spent confirm token', () => {
    expect(service.confirm('not-a-real-token').ok).toBe(false);

    const outcome = service.subscribe('b@example.com');
    if (!('token' in outcome)) throw new Error('expected a token');

    service.confirm(outcome.token);
    expect(service.confirm(outcome.token).ok).toBe(false);
  });

  it('rejects an expired confirm token', () => {
    const outcome = service.subscribe('c@example.com');
    if (!('token' in outcome)) throw new Error('expected a token');

    const result = service.confirm(
      outcome.token,
      Date.now() + NewsletterPolicy.confirmLinkMs + 1000,
    );

    expect(result.ok).toBe(false);
  });

  it('does not disturb an already-confirmed subscriber, and reports it back', () => {
    const first = service.subscribe('d@example.com');
    if (!('token' in first)) throw new Error('expected a token');
    service.confirm(first.token);

    const second = service.subscribe('d@example.com');

    expect('alreadyConfirmed' in second).toBe(true);
    expect(service.stats().confirmed).toBe(1);
  });

  it('unsubscribes with the permanent token issued at confirmation', () => {
    const outcome = service.subscribe('e@example.com');
    if (!('token' in outcome)) throw new Error('expected a token');
    const confirmed = service.confirm(outcome.token);
    if (!confirmed.ok) throw new Error('expected confirmation to succeed');

    expect(service.unsubscribe(confirmed.unsubscribeToken)).toBe(true);
    expect(service.stats()).toEqual({
      pending: 0,
      confirmed: 0,
      unsubscribed: 1,
    });
    expect(service.listConfirmed()).toHaveLength(0);
  });

  it('rejects an unknown unsubscribe token', () => {
    expect(service.unsubscribe('nonsense')).toBe(false);
  });

  it('lets an unsubscribed address subscribe again', () => {
    const first = service.subscribe('f@example.com');
    if (!('token' in first)) throw new Error('expected a token');
    const confirmed = service.confirm(first.token);
    if (!confirmed.ok) throw new Error('expected confirmation to succeed');
    service.unsubscribe(confirmed.unsubscribeToken);

    const second = service.subscribe('f@example.com');

    expect('token' in second).toBe(true);
    expect(service.all()[0].status).toBe(SubscriberStatus.Pending);
  });

  it('only counts confirmed subscribers as eligible recipients', () => {
    service.subscribe('pending@example.com');
    const confirmedOne = service.subscribe('confirmed@example.com');
    if (!('token' in confirmedOne)) throw new Error('expected a token');
    service.confirm(confirmedOne.token);

    expect(service.listConfirmed()).toHaveLength(1);
    expect(service.listConfirmed()[0].email).toBe('confirmed@example.com');
  });
});
