import { Account } from './account.model';

export interface RegisterInput {
  name?: string;
  email?: string;
}

export interface CredentialsInput {
  email?: string;
  password?: string;
}

/** Choosing a password from an emailed link, for setup and for reset alike. */
export interface SetPasswordInput {
  token?: string;
  password?: string;
}

export interface ForgotInput {
  email?: string;
}

/** The owner-issued reset code, for learners who can no longer receive email. */
export interface RecoveryInput {
  email?: string;
  code?: string;
  password?: string;
}

export interface IssueResetInput {
  note?: string;
}

export interface RecoveryRequestInput {
  email?: string;
  course?: string;
  note?: string;
}

export interface NextTarget {
  next?: string;
}

export type AccountView = Pick<Account, 'id' | 'name' | 'email'>;

export function describeAccount(account: Account): AccountView {
  return { id: account.id, name: account.name, email: account.email };
}

export interface IssuedResetView {
  code: string;
  url: string;
}
