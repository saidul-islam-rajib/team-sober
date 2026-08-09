/**
 * Why a link was issued. `Setup` finishes a registration and verifies the
 * address at the same time; `Reset` replaces a password somebody already had.
 */
export enum TokenPurpose {
  Setup = 'SETUP',
  Reset = 'RESET',
}

export interface PasswordToken {
  id: string;
  accountId: string;
  /** sha256 of the token. The token itself only ever exists in the email. */
  tokenHash: string;
  purpose: TokenPurpose;
  issuedAt: string;
  expiresAt: string;
  usedAt: string;
  requestedIp: string;
}

export interface PasswordTokenStore {
  tokens: PasswordToken[];
}

export enum TokenState {
  Live = 'live',
  Used = 'used',
  Expired = 'expired',
}

export function tokenState(token: PasswordToken, now = Date.now()): TokenState {
  if (token.usedAt) return TokenState.Used;

  return Date.parse(token.expiresAt) > now
    ? TokenState.Live
    : TokenState.Expired;
}

export const TOKEN_PROBLEMS: Record<
  Exclude<TokenState, TokenState.Live>,
  string
> = {
  [TokenState.Used]: 'That link has already been used.',
  [TokenState.Expired]: 'That link has expired.',
};

export const UNKNOWN_TOKEN = 'That link is not valid.';
