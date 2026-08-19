import { randomBytes, scryptSync } from 'crypto';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AdminsService } from './admins.service';

const EMAIL = 'owner@example.com';
const PASSWORD = 'correct-horse-battery';

describe('AdminsService', () => {
  let dir: string;
  let service: AdminsService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'admins-test-'));
    process.env.DATA_DIR = dir;
    service = new AdminsService();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  describe('creating', () => {
    it('creates an admin with a sealed password', async () => {
      const admin = await service.create(EMAIL, PASSWORD);

      expect(admin.email).toBe(EMAIL);
      expect(admin.secret).not.toBe('');
      expect(admin.secret).not.toBe(PASSWORD);
      expect(service.count).toBe(1);
    });

    it('normalises the email it stores', async () => {
      const admin = await service.create('  A@B.COM ', PASSWORD);

      expect(admin.email).toBe('a@b.com');
    });
  });

  describe('authenticating', () => {
    it('accepts the right password and refuses the wrong one', async () => {
      await service.create(EMAIL, PASSWORD);

      expect(
        await service.authenticate({ email: EMAIL, password: PASSWORD }),
      ).toBeTruthy();
      expect(
        await service.authenticate({ email: EMAIL, password: 'wrong' }),
      ).toBeUndefined();
    });

    it('is not fooled by an unknown address', async () => {
      await service.create(EMAIL, PASSWORD);

      expect(
        await service.authenticate({
          email: 'nobody@example.com',
          password: PASSWORD,
        }),
      ).toBeUndefined();
    });

    it('upgrades an older hash the moment the password proves itself', async () => {
      const admin = await service.create(EMAIL, PASSWORD);

      const salt = randomBytes(16).toString('hex');
      admin.secret = `${salt}:${scryptSync(PASSWORD, salt, 64).toString('hex')}`;

      expect(
        await service.authenticate({ email: EMAIL, password: PASSWORD }),
      ).toBeTruthy();
      expect(service.findByEmail(EMAIL)!.secret).toMatch(/^scrypt\$/);
    });
  });

  describe('resetting a password', () => {
    it('replaces the sealed password so the old one stops working', async () => {
      const admin = await service.create(EMAIL, PASSWORD);
      await service.resetPassword(admin.id, 'a-different-password');

      expect(
        await service.authenticate({ email: EMAIL, password: PASSWORD }),
      ).toBeUndefined();
      expect(
        await service.authenticate({
          email: EMAIL,
          password: 'a-different-password',
        }),
      ).toBeTruthy();
    });

    it('leaves nothing behind for an admin that is not there', async () => {
      expect(await service.resetPassword('nobody', PASSWORD)).toBeUndefined();
    });
  });

  describe('changing email', () => {
    it('moves sign-in to the new address', async () => {
      const admin = await service.create(EMAIL, PASSWORD);
      service.changeEmail(admin.id, 'new@example.com');

      expect(service.findByEmail(EMAIL)).toBeUndefined();
      expect(
        await service.authenticate({
          email: 'new@example.com',
          password: PASSWORD,
        }),
      ).toBeTruthy();
    });
  });

  describe('removing', () => {
    it('takes away the ability to sign in', async () => {
      const admin = await service.create(EMAIL, PASSWORD);
      service.remove(admin.id);

      expect(service.count).toBe(0);
      expect(
        await service.authenticate({ email: EMAIL, password: PASSWORD }),
      ).toBeUndefined();
    });
  });

  describe('listing', () => {
    it('sorts admins by email', async () => {
      await service.create('zed@example.com', PASSWORD);
      await service.create('amy@example.com', PASSWORD);

      expect(service.list().map((admin) => admin.email)).toEqual([
        'amy@example.com',
        'zed@example.com',
      ]);
    });
  });
});
