import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { RecoveryPolicy } from '../shared/config/policies';
import { RECOVERY_ALPHABET } from './account.constants';

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

const LEGACY = /^[a-f0-9]{32}:[a-f0-9]{128}$/i;

function maxMemFor(cost: number, blockSize: number): number {
  return 256 * cost * blockSize;
}

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
