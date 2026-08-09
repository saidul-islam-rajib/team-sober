import { RecoveryPolicy } from '../shared/config/policies';
import {
  EMAIL_PATTERN,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
} from './account.constants';
import { hasCodeLength } from './recovery-code';
import {
  CredentialsInput,
  ForgotInput,
  RecoveryInput,
  RecoveryRequestInput,
  RegisterInput,
  SetPasswordInput,
} from './account.dto';

export function normaliseName(value?: string): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
}

export function normaliseEmail(value?: string): string {
  return (value ?? '').trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH);
}

export function validEmail(value?: string): boolean {
  return EMAIL_PATTERN.test(normaliseEmail(value));
}

export function validPassword(value?: string): boolean {
  const length = (value ?? '').length;

  return (
    length >= RecoveryPolicy.minPasswordLength && length <= MAX_PASSWORD_LENGTH
  );
}

function passwordRequirement(): string {
  return `at least ${RecoveryPolicy.minPasswordLength} characters`;
}

export function passwordProblem(value?: string): string {
  if ((value ?? '').length > MAX_PASSWORD_LENGTH) {
    return `Choose a password of ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  }

  return validPassword(value)
    ? ''
    : `Choose a password of ${passwordRequirement()}.`;
}

export function registrationProblem(input: RegisterInput): string {
  if (!normaliseName(input.name))
    return 'Enter the name you want on your certificates.';
  if (!validEmail(input.email))
    return 'Enter an email address that looks right.';

  return '';
}

export function credentialsProblem(input: CredentialsInput): string {
  if (!validEmail(input.email)) return 'Enter the email on your account.';
  if (!input.password) return 'Enter your password.';

  return '';
}

export function setPasswordProblem(input: SetPasswordInput): string {
  return passwordProblem(input.password);
}

export function forgotProblem(input: ForgotInput): string {
  return validEmail(input.email)
    ? ''
    : 'Enter the email address on the account.';
}

export function resetProblem(input: RecoveryInput): string {
  if (!validEmail(input.email))
    return 'Enter the email address on the account.';
  if (!hasCodeLength(input.code))
    return 'Enter the reset code from the link you were given.';

  return passwordProblem(input.password);
}

export function recoveryRequestProblem(input: RecoveryRequestInput): string {
  if (!validEmail(input.email))
    return 'Enter the email address on the account.';
  if (!(input.course ?? '').trim() && !(input.note ?? '').trim()) {
    return 'Tell the owner which course you were taking, so they can find you.';
  }

  return '';
}
