import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { RecoveryPolicy } from '../shared/config/policies';
import { RECOVERY_ALPHABET } from './account.constants';

/**
 * Password and recovery-code hashing.
 *
 * The stored form is `scrypt$N$r$p$salt$hash`, byte-for-byte the encoding
 * Bachelor Point uses, so a password set in either application verifies in the
 * other. That matters as soon as the two share accounts: whichever app the
 * learner happened to set their password in, the other has to be able to check
 * it.
 *
 * The older `salt:hash` hex pairs this project wrote before the two were
 * aligned still verify, and are quietly re-hashed into the current format the
 * next time the password is used.
 */

const deriveKey = promisify(scrypt) as (
  password: string,
  salt: Buffer | string,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const PREFIX = 'scrypt';

const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

/** The legacy encoding: two hex fields separated by a colon. */
const LEGACY = /^[a-f0-9]{32}:[a-f0-9]{128}$/i;

function maxMemFor(cost: number, blockSize: number): number {
  return 256 * cost * blockSize;
}

/**
 * Normalising means two visually identical passwords typed on different
 * keyboards hash the same. Both applications do it, so both must keep doing
 * it — dropping it would invalidate every stored hash.
 */
function prepare(value: string): string {
  return value.normalize('NFKC');
}

export async function seal(value: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);

  const derived = await deriveKey(prepare(value), salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELISM,
    maxmem: maxMemFor(COST, BLOCK_SIZE),
  });

  return [
    PREFIX,
    COST,
    BLOCK_SIZE,
    PARALLELISM,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join('$');
}

function sameBytes(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

async function legacyMatches(sealed: string, value: string): Promise<boolean> {
  const [salt, expected] = sealed.split(':');

  const derived = await deriveKey(value, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELISM,
    maxmem: maxMemFor(COST, BLOCK_SIZE),
  });

  return sameBytes(derived, Buffer.from(expected, 'hex'));
}

export async function sealMatches(
  sealed: string,
  value: string,
): Promise<boolean> {
  if (!sealed) return false;

  // The old form hashed the raw string, without normalising it first.
  if (LEGACY.test(sealed)) return legacyMatches(sealed, value);

  const parts = sealed.split('$');
  if (parts.length !== 6 || parts[0] !== PREFIX) return false;

  const [, costRaw, blockRaw, parallelRaw, saltB64, hashB64] = parts;

  const cost = Number(costRaw);
  const blockSize = Number(blockRaw);
  const parallelism = Number(parallelRaw);

  if (
    !Number.isInteger(cost) ||
    !Number.isInteger(blockSize) ||
    !Number.isInteger(parallelism)
  ) {
    return false;
  }

  // N must be a power of two greater than one, or scrypt throws.
  if (cost <= 1 || (cost & (cost - 1)) !== 0) return false;
  if (blockSize < 1 || parallelism < 1) return false;

  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');
  if (salt.length === 0 || expected.length === 0) return false;

  try {
    const derived = await deriveKey(prepare(value), salt, expected.length, {
      N: cost,
      r: blockSize,
      p: parallelism,
      maxmem: maxMemFor(cost, blockSize),
    });

    return sameBytes(derived, expected);
  } catch {
    return false;
  }
}

/**
 * Whether a stored hash is weaker than what we write today. Checked after a
 * successful sign-in, when the plaintext is in hand and can be re-hashed.
 */
export function needsRehash(sealed: string): boolean {
  if (!sealed) return true;
  if (LEGACY.test(sealed)) return true;

  const parts = sealed.split('$');
  if (parts.length !== 6 || parts[0] !== PREFIX) return true;

  return (
    Number(parts[1]) < COST ||
    Number(parts[2]) < BLOCK_SIZE ||
    Number(parts[3]) < PARALLELISM
  );
}

export function newCode(): string {
  let code = '';

  for (const byte of randomBytes(RecoveryPolicy.codeLength)) {
    code += RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length];
  }

  return code;
}
