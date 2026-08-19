import { passwordProblem, validEmail } from '../accounts/account.rules';

export interface Admin {
  id: string;
  email: string;
  secret: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminStore {
  admins: Admin[];
}

export interface CreateAdminInput {
  email?: string;
  password?: string;
}

export interface ChangeAdminEmailInput {
  email?: string;
}

export interface ResetAdminPasswordInput {
  password?: string;
}

export function createAdminProblem(input: CreateAdminInput): string {
  if (!validEmail(input.email))
    return 'Enter an email address that looks right.';

  return passwordProblem(input.password);
}

export function changeAdminEmailProblem(input: ChangeAdminEmailInput): string {
  return validEmail(input.email)
    ? ''
    : 'Enter an email address that looks right.';
}

export function resetAdminPasswordProblem(
  input: ResetAdminPasswordInput,
): string {
  return passwordProblem(input.password);
}
