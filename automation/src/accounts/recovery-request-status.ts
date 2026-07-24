import { Tone } from '../shared/view/components';

export enum RecoveryRequestStatus {
  Pending = 'pending',
  Handled = 'handled',
  Dismissed = 'dismissed',
}

export interface RecoveryRequestDescriptor {
  label: string;
  tone: Tone;
}

export const RECOVERY_REQUEST_DESCRIPTORS: Record<
  RecoveryRequestStatus,
  RecoveryRequestDescriptor
> = {
  [RecoveryRequestStatus.Pending]: { label: 'Pending', tone: 'warn' },
  [RecoveryRequestStatus.Handled]: { label: 'Handled', tone: 'good' },
  [RecoveryRequestStatus.Dismissed]: { label: 'Dismissed', tone: 'muted' },
};

export function describeRequestStatus(
  status: RecoveryRequestStatus,
): RecoveryRequestDescriptor {
  return RECOVERY_REQUEST_DESCRIPTORS[status];
}
