import { randomBytes, scryptSync } from 'crypto';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AccountsService } from './accounts.service';
import { AccountStatus } from './account-status';
import {
  MAX_PASSWORD_LENGTH,
  normaliseEmail,
  normaliseName,
  registrationProblem,
  setPasswordProblem,
  validEmail,
  validPassword,
} from './account.model';
import { needsRehash, seal, sealMatches } from './secret';
import { RecoveryPolicy } from '../shared/config/policies';
import { IDENTITY_ISSUER, identityId } from '../shared/identity/identity';

const MIN_PASSWORD_LENGTH = RecoveryPolicy.minPasswordLength;

const NAME = 'Saidul Islam Rajib';
const EMAIL = 'rajib@example.com';
const PASSWORD = 'correct-horse-battery';

describe('account.model', () => {
  it('trims and collapses a name', () => {
    expect(normaliseName('  Saidul   Islam  ')).toBe('Saidul Islam');
  });

  it('lowercases and trims an email', () => {
    expect(normaliseEmail('  A@B.COM ')).toBe('a@b.com');
  });

  it('accepts an address that looks right and rejects one that does not', () => {
    expect(validEmail('a@b.com')).toBe(true);
    expect(validEmail('a@b')).toBe(false);
    expect(validEmail('')).toBe(false);
  });

  it('requires a password of the stated length', () => {
    expect(validPassword('x'.repeat(MIN_PASSWORD_LENGTH))).toBe(true);
    expect(validPassword('x'.repeat(MIN_PASSWORD_LENGTH - 1))).toBe(false);
  });

  it('refuses a password long enough to be a denial of service', () => {
    expect(validPassword('x'.repeat(MAX_PASSWORD_LENGTH))).toBe(true);
    expect(validPassword('x'.repeat(MAX_PASSWORD_LENGTH + 1))).toBe(false);
    expect(
      setPasswordProblem({ password: 'x'.repeat(MAX_PASSWORD_LENGTH + 1) }),
    ).toContain('or fewer');
  });

  it('reports the first problem with a registration', () => {
    expect(registrationProblem({})).toContain('name');
    expect(registrationProblem({ name: 'A' })).toContain('email');
    expect(registrationProblem({ name: 'A', email: 'a@b.com' })).toBe('');
  });

  it('no longer asks for a password when registering', () => {
    expect(registrationProblem({ name: 'A', email: 'a@b.com' })).toBe('');
  });
});

describe('secret', () => {
  it('round-trips a password', async () => {
    const sealed = await seal(PASSWORD);

    expect(await sealMatches(sealed, PASSWORD)).toBe(true);
    expect(await sealMatches(sealed, 'something else')).toBe(false);
  });

  it('writes the format Bachelor Point also reads', async () => {
    expect(await seal(PASSWORD)).toMatch(/^scrypt\$16384\$8\$1\$[^$]+\$[^$]+$/);
  });

  it('salts, so the same password seals differently each time', async () => {
    expect(await seal(PASSWORD)).not.toBe(await seal(PASSWORD));
  });

  it('still verifies the older salt:hash form this project used to write', async () => {
    const salt = randomBytes(16).toString('hex');
    const legacy = `${salt}:${scryptSync(PASSWORD, salt, 64).toString('hex')}`;

    expect(await sealMatches(legacy, PASSWORD)).toBe(true);
    expect(await sealMatches(legacy, 'wrong')).toBe(false);
    expect(needsRehash(legacy)).toBe(true);
  });

  it('does not want to rehash what it just wrote', async () => {
    expect(needsRehash(await seal(PASSWORD))).toBe(false);
  });

  it('refuses nonsense rather than throwing', async () => {
    expect(await sealMatches('', PASSWORD)).toBe(false);
    expect(await sealMatches('not-a-hash', PASSWORD)).toBe(false);
    expect(await sealMatches('scrypt$3$8$1$AAAA$BBBB', PASSWORD)).toBe(false);
  });
});

describe('AccountsService', () => {
  let dir: string;
  let service: AccountsService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'accounts-test-'));
    process.env.DATA_DIR = dir;
    service = new AccountsService();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  const begin = (over: { name?: string; email?: string } = {}) =>
    service.beginRegistration({ name: NAME, email: EMAIL, ...over });

  const registered = async () => {
    const account = begin();
    await service.setPassword(account!.id, PASSWORD);

    return service.findByEmail(EMAIL)!;
  };

  describe('registering', () => {
    it('creates an account with no password, awaiting the emailed link', () => {
      const account = begin();

      expect(account).toBeTruthy();
      expect(account!.secret).toBe('');
      expect(account!.status).toBe(AccountStatus.Unverified);
      expect(account!.tokenVersion).toBe(0);
      expect(account!.origin).toBe(IDENTITY_ISSUER);
    });

    it('normalises what it stores', () => {
      const account = begin({ name: '  Saidul   Rajib ', email: ' A@B.COM ' });

      expect(account!.name).toBe('Saidul Rajib');
      expect(account!.email).toBe('a@b.com');
    });

    it('cannot be signed into until a password is set', async () => {
      begin();

      expect(
        await service.authenticate({ email: EMAIL, password: '' }),
      ).toBeUndefined();
      expect(
        await service.authenticate({ email: EMAIL, password: PASSWORD }),
      ).toBeUndefined();
    });

    it('re-sends rather than duplicating while it is still awaiting a password', () => {
      const first = begin();
      const second = begin({ name: 'Corrected Name' });

      expect(second).toBeTruthy();
      expect(second!.id).toBe(first!.id);
      expect(second!.name).toBe('Corrected Name');
      expect(service.count).toBe(1);
    });

    it('declines to say anything once the address has a working password', async () => {
      await registered();

      expect(begin()).toBeNull();
      expect(service.count).toBe(1);
    });
  });

  describe('setting a password', () => {
    it('activates the account and signs a password in', async () => {
      const account = begin()!;
      const updated = await service.setPassword(account.id, PASSWORD);

      expect(updated!.status).toBe(AccountStatus.Active);
      expect(updated!.secret).not.toBe('');
      expect(
        await service.authenticate({ email: EMAIL, password: PASSWORD }),
      ).toBeTruthy();
    });

    it('bumps the token version, retiring sessions issued before it', async () => {
      const account = begin()!;

      await service.setPassword(account.id, PASSWORD);
      expect(service.findByEmail(EMAIL)!.tokenVersion).toBe(1);

      await service.setPassword(account.id, 'a-different-password');
      expect(service.findByEmail(EMAIL)!.tokenVersion).toBe(2);
    });

    it('leaves nothing behind for an account that is not there', async () => {
      expect(await service.setPassword('nobody', PASSWORD)).toBeUndefined();
    });
  });

  describe('authenticating', () => {
    it('accepts the right password and refuses the wrong one', async () => {
      await registered();

      expect(
        await service.authenticate({ email: EMAIL, password: PASSWORD }),
      ).toBeTruthy();
      expect(
        await service.authenticate({ email: EMAIL, password: 'wrong' }),
      ).toBeUndefined();
    });

    it('is not fooled by an unknown address', async () => {
      await registered();

      expect(
        await service.authenticate({
          email: 'nobody@example.com',
          password: PASSWORD,
        }),
      ).toBeUndefined();
    });

    it('upgrades an older hash the moment the password proves itself', async () => {
      const account = begin()!;

      const salt = randomBytes(16).toString('hex');
      account.secret = `${salt}:${scryptSync(PASSWORD, salt, 64).toString('hex')}`;
      account.status = AccountStatus.Active;

      expect(
        await service.authenticate({ email: EMAIL, password: PASSWORD }),
      ).toBeTruthy();

      expect(service.findByEmail(EMAIL)!.secret).toMatch(/^scrypt\$/);
    });
  });

  describe('adopting somebody from a sibling application', () => {
    const claims = {
      sub: identityId('elsewhere@example.com'),
      email: 'elsewhere@example.com',
      name: 'From Bachelor Point',
      iss: 'bachelor-point',
      sv: 4,
      iat: 0,
      exp: 0,
    };

    it('creates a local account, active but without a local password', () => {
      const account = service.provisionFromIdentity(claims);

      expect(account.status).toBe(AccountStatus.Active);
      expect(account.secret).toBe('');
      expect(account.origin).toBe('bachelor-point');
    });

    it('does not create a second one on the next visit', () => {
      const first = service.provisionFromIdentity(claims);
      const second = service.provisionFromIdentity(claims);

      expect(second.id).toBe(first.id);
      expect(service.count).toBe(1);
    });

    it('joins up with an account that already exists here', async () => {
      const mine = await registered();

      const same = service.provisionFromIdentity({ ...claims, email: EMAIL });

      expect(same.id).toBe(mine.id);
      expect(service.count).toBe(1);
    });

    it('still cannot be signed into locally with an empty password', () => {
      service.provisionFromIdentity(claims);

      return expect(
        service.authenticate({ email: claims.email, password: '' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('listing', () => {
    it('finds an account by part of the name or address', async () => {
      await registered();

      expect(service.list('rajib')).toHaveLength(1);
      expect(service.list('example.com')).toHaveLength(1);
      expect(service.list('nobody')).toHaveLength(0);
      expect(service.list()).toHaveLength(1);
    });
  });
});
