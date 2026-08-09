import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import express, { urlencoded } from 'express';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import { AppModule } from '../../src/app.module';

export const PASSWORD = 'test-password';

export const AUTH_SECRET = 'an-end-to-end-test-secret-of-sufficient-length';

export const LEARNER_PASSWORD = 'correct-horse-battery';

const SESSION_COOKIE = 'ts_identity';

export interface HealthBody {
  status: string;
  uptime: number;
  posts: number;
}

export interface SearchBody {
  results: { title: string; url: string; kind: string; meta: string }[];
}

export interface UploadBody {
  url: string;
  name: string;
  size: number;
  markdown: string;
}

export interface TestContext {
  app: INestApplication<App>;
  dir: string;
  readonly server: App;
  signIn(): Promise<string>;
}

export const portraitJpeg = (): Promise<Buffer> =>
  sharp({
    create: {
      width: 492,
      height: 612,
      channels: 3,
      background: { r: 90, g: 120, b: 180 },
    },
  })
    .jpeg()
    .toBuffer();

export function useTestApp(): TestContext {
  const ctx: TestContext = {
    app: null as unknown as INestApplication<App>,
    dir: '',
    get server(): App {
      return ctx.app.getHttpServer();
    },
    async signIn(): Promise<string> {
      const res = await request(ctx.server)
        .post('/login')
        .type('form')
        .send({ password: PASSWORD })
        .expect(302);

      return (res.headers['set-cookie'] as unknown as string[])[0];
    },
  };

  beforeEach(async () => {
    ctx.dir = mkdtempSync(join(tmpdir(), 'blog-e2e-'));
    process.env.DATA_DIR = ctx.dir;
    process.env.ADMIN_PASSWORD = PASSWORD;
    process.env.AUTH_SECRET = AUTH_SECRET;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    ctx.app = moduleFixture.createNestApplication();
    ctx.app.use(cookieParser());
    ctx.app.use(urlencoded({ extended: true }));
    ctx.app.use('/uploads', express.static(join(ctx.dir, 'uploads')));
    await ctx.app.init();
  });

  afterEach(async () => {
    await ctx.app.close();
    delete process.env.DATA_DIR;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.AUTH_SECRET;
    rmSync(ctx.dir, { recursive: true, force: true });
  });

  return ctx;
}

export function setupLinkFrom(html: string): string {
  return (
    /id="setup-link"[^>]*>([^<]+)</
      .exec(html)?.[1]
      .trim()
      .replace(/&amp;/g, '&') ?? ''
  );
}

export function sessionCookieFrom(res: request.Response): string {
  const cookies = (res.headers['set-cookie'] as unknown as string[]) ?? [];

  return cookies.find((cookie) => cookie.startsWith(SESSION_COOKIE)) ?? '';
}

export async function learnerSession(
  ctx: TestContext,
  overrides: { name?: string; email?: string; password?: string } = {},
): Promise<string> {
  const {
    name = 'Saidul Islam Rajib',
    email = 'rajib@example.com',
    password = LEARNER_PASSWORD,
  } = overrides;

  const registered = await request(ctx.server)
    .post('/account/register')
    .type('form')
    .send({ name, email })
    .expect(200);

  const link = setupLinkFrom(registered.text);
  const token = new URL(link).searchParams.get('token') ?? '';

  const res = await request(ctx.server)
    .post('/account/set-password')
    .type('form')
    .send({ token, password })
    .expect(302);

  return sessionCookieFrom(res);
}
