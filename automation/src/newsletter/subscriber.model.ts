export enum SubscriberStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Unsubscribed = 'unsubscribed',
}

export interface Subscriber {
  id: string;
  email: string;
  status: SubscriberStatus;
  confirmTokenHash: string;
  confirmExpiresAt: string;
  unsubscribeToken: string;
  createdAt: string;
  confirmedAt: string;
  unsubscribedAt: string;
}

export interface SubscriberStats {
  pending: number;
  confirmed: number;
  unsubscribed: number;
}
