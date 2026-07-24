import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupportPolicy } from '../shared/config/policies';
import { JsonCollection } from '../shared/persistence/json-collection';
import {
  MAX_COURSE_LENGTH,
  MAX_REQUEST_NOTE_LENGTH,
} from './account.constants';
import { RecoveryRequestInput } from './account.dto';
import { normaliseEmail } from './account.rules';
import { AccountRecoveryRequest } from './recovery-request.model';
import { RecoveryRequestStatus } from './recovery-request-status';

@Injectable()
export class AccountRecoveryRequestService {
  private readonly logger = new Logger(AccountRecoveryRequestService.name);

  private readonly store = new JsonCollection<AccountRecoveryRequest>({
    file: 'account-recovery-requests.json',
    key: 'requests',
    label: 'recovery request(s)',
  });

  submit(input: RecoveryRequestInput): AccountRecoveryRequest {
    const request = this.store.add({
      id: randomUUID(),
      email: normaliseEmail(input.email),
      course: (input.course ?? '').trim().slice(0, MAX_COURSE_LENGTH),
      note: (input.note ?? '').trim().slice(0, MAX_REQUEST_NOTE_LENGTH),
      status: RecoveryRequestStatus.Pending,
      createdAt: new Date().toISOString(),
      handledAt: '',
    });

    this.trim();
    this.logger.warn(`Recovery request received for ${request.email}`);

    return request;
  }

  private byNewest(
    a: AccountRecoveryRequest,
    b: AccountRecoveryRequest,
  ): number {
    return b.createdAt.localeCompare(a.createdAt);
  }

  pending(): AccountRecoveryRequest[] {
    return this.store
      .filter((request) => request.status === RecoveryRequestStatus.Pending)
      .sort((a, b) => this.byNewest(a, b));
  }

  all(): AccountRecoveryRequest[] {
    return [...this.store.all()].sort((a, b) => this.byNewest(a, b));
  }

  find(id: string): AccountRecoveryRequest | undefined {
    return this.store.find((request) => request.id === id);
  }

  get pendingCount(): number {
    return this.store.filter(
      (request) => request.status === RecoveryRequestStatus.Pending,
    ).length;
  }

  private resolve(id: string, status: RecoveryRequestStatus): boolean {
    const request = this.find(id);
    if (!request || request.status !== RecoveryRequestStatus.Pending) {
      return false;
    }

    request.status = status;
    request.handledAt = new Date().toISOString();
    this.store.persist();

    return true;
  }

  markHandled(id: string): boolean {
    return this.resolve(id, RecoveryRequestStatus.Handled);
  }

  dismiss(id: string): boolean {
    return this.resolve(id, RecoveryRequestStatus.Dismissed);
  }

  /**
   * Keeps every pending request and caps the resolved tail, so the queue an
   * unauthenticated form feeds into cannot grow without bound.
   */
  private trim(): void {
    const limit = SupportPolicy.requestQueueLimit;
    const all = this.store.all();
    if (all.length <= limit) return;

    const pending = all.filter(
      (request) => request.status === RecoveryRequestStatus.Pending,
    );
    const resolved = all
      .filter((request) => request.status !== RecoveryRequestStatus.Pending)
      .sort((a, b) => this.byNewest(a, b))
      .slice(0, Math.max(0, limit - pending.length));

    this.store.replaceAll([...pending, ...resolved]);
  }

  get count(): number {
    return this.store.size;
  }
}
