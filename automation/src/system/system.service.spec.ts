import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { LoginThrottleService } from '../auth/login-throttle.service';
import { CommentsService } from '../comments/comments.service';
import { SubscribersService } from '../newsletter/subscribers.service';
import { PostsService } from '../posts/posts.service';
import { ProjectsService } from '../projects/projects.service';
import { MailerService } from '../shared/mail/mailer.service';
import { SystemService } from './system.service';

describe('SystemService', () => {
  let dir: string;
  let service: SystemService;
  let throttle: LoginThrottleService;
  const ENV_KEYS = [
    'ADMIN_PASSWORD',
    'SESSION_SECRET',
    'AUTH_SECRET',
    'TRUST_PROXY',
  ] as const;
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'system-test-'));
    process.env.DATA_DIR = dir;

    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }

    throttle = new LoginThrottleService();
    service = new SystemService(
      new PostsService(),
      new ProjectsService(),
      new CommentsService(),
      new SubscribersService(),
      new MailerService(),
      throttle,
    );
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports every config flag as missing when nothing is set', () => {
    const health = service.health();

    expect(health.config).toEqual({
      adminPasswordSet: false,
      sessionSecretSet: false,
      authSecretSet: false,
      trustProxySet: false,
      mailConfigured: false,
    });
  });

  it('reports config flags as set once the env vars are present', () => {
    process.env.ADMIN_PASSWORD = 'secret';
    process.env.SESSION_SECRET = 'a'.repeat(40);
    process.env.TRUST_PROXY = '1';

    const health = service.health();

    expect(health.config.adminPasswordSet).toBe(true);
    expect(health.config.sessionSecretSet).toBe(true);
    expect(health.config.trustProxySet).toBe(true);
  });

  it('treats AUTH_SECRET under 32 characters as not set', () => {
    process.env.AUTH_SECRET = 'too-short';

    expect(service.health().config.authSecretSet).toBe(false);
  });

  it('falls back to SESSION_SECRET for the AUTH_SECRET check when AUTH_SECRET is unset', () => {
    process.env.SESSION_SECRET = 'a'.repeat(40);

    expect(service.health().config.authSecretSet).toBe(true);
  });

  it('measures the data directory, on top of whatever the services already seeded', () => {
    const before = service.health().dataDir;

    writeFileSync(join(dir, 'system-test-marker.txt'), '12345');

    const after = service.health().dataDir;

    expect(after.bytes).toBe(before.bytes + 5);
    expect(after.files).toBe(before.files + 1);
  });

  it('reports current login lockouts and clears them on request', () => {
    for (let i = 0; i < 10; i++) throttle.recordFailure('203.0.113.9');

    expect(service.health().loginLockouts).toBeGreaterThan(0);

    const cleared = service.clearLockouts();

    expect(cleared).toBeGreaterThan(0);
    expect(service.health().loginLockouts).toBe(0);
  });

  it('counts posts, projects, comments and confirmed subscribers', () => {
    const health = service.health();

    expect(health.counts.posts).toBeGreaterThan(0);
    expect(health.counts.projects).toBeGreaterThan(0);
    expect(health.counts.comments).toBe(0);
    expect(health.counts.confirmedSubscribers).toBe(0);
  });
});
