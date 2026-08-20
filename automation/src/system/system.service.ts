import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { LoginThrottleService } from '../auth/login-throttle.service';
import { CommentsService } from '../comments/comments.service';
import { SubscribersService } from '../newsletter/subscribers.service';
import { PostsService } from '../posts/posts.service';
import { ProjectsService } from '../projects/projects.service';
import { MailerService } from '../shared/mail/mailer.service';
import { dirSize } from './dir-size';

export interface SystemHealth {
  uptimeSeconds: number;
  memory: { rssBytes: number; heapUsedBytes: number; heapTotalBytes: number };
  dataDir: { path: string; bytes: number; files: number };
  config: {
    adminPasswordSet: boolean;
    sessionSecretSet: boolean;
    authSecretSet: boolean;
    trustProxySet: boolean;
    mailConfigured: boolean;
  };
  counts: {
    posts: number;
    projects: number;
    comments: number;
    confirmedSubscribers: number;
  };
  loginLockouts: number;
}

const MIN_SECRET_LENGTH = 32;

@Injectable()
export class SystemService {
  constructor(
    private readonly posts: PostsService,
    private readonly projects: ProjectsService,
    private readonly comments: CommentsService,
    private readonly subscribers: SubscribersService,
    private readonly mailer: MailerService,
    private readonly throttle: LoginThrottleService,
  ) {}

  private get dataDir(): string {
    return process.env.DATA_DIR ?? join(process.cwd(), 'data');
  }

  health(): SystemHealth {
    const mem = process.memoryUsage();
    const dir = dirSize(this.dataDir);
    const authSecret =
      process.env.AUTH_SECRET ?? process.env.SESSION_SECRET ?? '';

    return {
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssBytes: mem.rss,
        heapUsedBytes: mem.heapUsed,
        heapTotalBytes: mem.heapTotal,
      },
      dataDir: { path: this.dataDir, bytes: dir.bytes, files: dir.files },
      config: {
        adminPasswordSet: Boolean(process.env.ADMIN_PASSWORD),
        sessionSecretSet: Boolean(process.env.SESSION_SECRET),
        authSecretSet: authSecret.length >= MIN_SECRET_LENGTH,
        trustProxySet: process.env.TRUST_PROXY === '1',
        mailConfigured: this.mailer.configured,
      },
      counts: {
        posts: this.posts.findAll().length,
        projects: this.projects.findAll().length,
        comments: this.comments.count,
        confirmedSubscribers: this.subscribers.stats().confirmed,
      },
      loginLockouts: this.throttle.lockedCount(),
    };
  }

  clearLockouts(): number {
    return this.throttle.clearAll();
  }
}
