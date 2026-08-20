import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { JsonCollection } from '../shared/persistence/json-collection';
import { NewsletterPolicy } from '../shared/config/policies';
import {
  Subscriber,
  SubscriberStats,
  SubscriberStatus,
} from './subscriber.model';

export type SubscribeOutcome = { token: string } | { alreadyConfirmed: true };

export type ConfirmOutcome =
  { ok: true; email: string; unsubscribeToken: string } | { ok: false };

@Injectable()
export class SubscribersService {
  private readonly store = new JsonCollection<Subscriber>({
    file: 'subscribers.json',
    key: 'subscribers',
    label: 'newsletter subscriber(s)',
  });

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private issueToken(): string {
    return randomBytes(24).toString('base64url');
  }

  subscribe(email: string, now = Date.now()): SubscribeOutcome {
    const normalized = email.trim().toLowerCase();
    const existing = this.store.find((s) => s.email === normalized);

    if (existing?.status === SubscriberStatus.Confirmed) {
      return { alreadyConfirmed: true };
    }

    const confirmToken = this.issueToken();
    const confirmTokenHash = this.hash(confirmToken);
    const confirmExpiresAt = new Date(
      now + NewsletterPolicy.confirmLinkMs,
    ).toISOString();

    if (existing) {
      existing.status = SubscriberStatus.Pending;
      existing.confirmTokenHash = confirmTokenHash;
      existing.confirmExpiresAt = confirmExpiresAt;
      if (!existing.unsubscribeToken)
        existing.unsubscribeToken = this.issueToken();
      this.store.persist();
    } else {
      this.store.add({
        id: randomUUID(),
        email: normalized,
        status: SubscriberStatus.Pending,
        confirmTokenHash,
        confirmExpiresAt,
        unsubscribeToken: this.issueToken(),
        createdAt: new Date(now).toISOString(),
        confirmedAt: '',
        unsubscribedAt: '',
      });
    }

    return { token: confirmToken };
  }

  confirm(token: string, now = Date.now()): ConfirmOutcome {
    if (!token) return { ok: false };

    const hash = this.hash(token);
    const subscriber = this.store.find(
      (s) => s.confirmTokenHash !== '' && s.confirmTokenHash === hash,
    );

    if (!subscriber) return { ok: false };
    if (Date.parse(subscriber.confirmExpiresAt) <= now) return { ok: false };

    subscriber.status = SubscriberStatus.Confirmed;
    subscriber.confirmedAt =
      subscriber.confirmedAt || new Date(now).toISOString();
    subscriber.confirmTokenHash = '';
    subscriber.confirmExpiresAt = '';
    this.store.persist();

    return {
      ok: true,
      email: subscriber.email,
      unsubscribeToken: subscriber.unsubscribeToken,
    };
  }

  unsubscribe(token: string): boolean {
    if (!token) return false;

    const subscriber = this.store.find(
      (s) => s.unsubscribeToken !== '' && s.unsubscribeToken === token,
    );

    if (!subscriber) return false;

    if (subscriber.status !== SubscriberStatus.Unsubscribed) {
      subscriber.status = SubscriberStatus.Unsubscribed;
      subscriber.unsubscribedAt = new Date().toISOString();
      this.store.persist();
    }

    return true;
  }

  listConfirmed(): Subscriber[] {
    return this.store.filter((s) => s.status === SubscriberStatus.Confirmed);
  }

  all(): Subscriber[] {
    return [...this.store.all()].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  }

  stats(): SubscriberStats {
    const all = this.store.all();

    return {
      pending: all.filter((s) => s.status === SubscriberStatus.Pending).length,
      confirmed: all.filter((s) => s.status === SubscriberStatus.Confirmed)
        .length,
      unsubscribed: all.filter(
        (s) => s.status === SubscriberStatus.Unsubscribed,
      ).length,
    };
  }
}
