import { RecoveryRequestStatus } from './recovery-request-status';

export interface AccountRecoveryRequest {
  id: string;
  email: string;
  course: string;
  note: string;
  status: RecoveryRequestStatus;
  createdAt: string;
  handledAt: string;
}

export interface RecoveryRequestStore {
  requests: AccountRecoveryRequest[];
}
