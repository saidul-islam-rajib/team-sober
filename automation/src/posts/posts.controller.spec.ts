import type { Request, Response } from 'express';
import { PostsController } from './posts.controller';
import { Post } from './post.model';
import { AuthService } from '../auth/auth.service';

function post(over: Partial<Post>): Post {
  return {
    id: 'p1',
    slug: 'live',
    title: 'Live post',
    subtitle: '',
    content: 'Hello',
    highlight: '',
    tags: [],
    relatedIds: [],
    status: 'published',
    publishedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    views: 0,
    ...over,
  };
}

const live = post({});
const scheduled = post({
  id: 'p2',
  slug: 'later',
  title: 'Scheduled post',
  publishedAt: new Date(Date.now() + 6 * 3600_000).toISOString(),
});
const draft = post({
  id: 'p3',
  slug: 'wip',
  title: 'Draft post',
  status: 'draft',
});

function setup(admin: boolean) {
  const posts = {
    findPublished: () => [live],
    findAll: () => [live, scheduled, draft],
    recordView: jest.fn(),
  };
  const auth = { verifyToken: (t?: string) => admin && t === 'ok' };
  const controller = new PostsController(
    posts as never,
    {} as never,
    {} as never,
    { forPost: () => [] } as never,
    { resolve: () => undefined } as never,
    auth as never,
  );

  const sent: {
    status: number;
    body: string;
    headers: Record<string, string>;
  } = {
    status: 200,
    body: '',
    headers: {},
  };
  const res = {
    type: () => res,
    status: (code: number) => {
      sent.status = code;
      return res;
    },
    setHeader: (k: string, v: string) => {
      sent.headers[k] = v;
    },
    send: (body: string) => {
      sent.body = body;
    },
  } as unknown as Response;
  const req = {
    cookies: { [AuthService.COOKIE]: 'ok' },
  } as unknown as Request;

  return { controller, posts, sent, res, req };
}

describe('PostsController post page', () => {
  it('shows a scheduled post to the signed-in admin with a banner', () => {
    const { controller, posts, sent, res, req } = setup(true);

    controller.post('later', req, res);

    expect(sent.status).toBe(200);
    expect(sent.body).toContain('Scheduled post');
    expect(sent.body).toContain('class="preview-banner"');
    expect(sent.body).toContain('Scheduled — only you can see this page.');
    expect(sent.body).toContain('content="noindex, nofollow"');
    expect(sent.headers['Cache-Control']).toBe('no-store');
    expect(posts.recordView).not.toHaveBeenCalled();
  });

  it('shows a draft to the signed-in admin', () => {
    const { controller, sent, res, req } = setup(true);

    controller.post('wip', req, res);

    expect(sent.status).toBe(200);
    expect(sent.body).toContain('Draft — only you can see this page.');
  });

  it('gives readers a helpful 404 for a scheduled post', () => {
    const { controller, sent, res, req } = setup(false);

    controller.post('later', req, res);

    expect(sent.status).toBe(404);
    expect(sent.body).not.toContain('Scheduled post');
    expect(sent.body).toContain('action="/search"');
    expect(sent.body).toContain('<a href="/post/live">Live post</a>');
  });

  it('renders a live post normally and counts the view', () => {
    const { controller, posts, sent, res, req } = setup(false);

    controller.post('live', req, res);

    expect(sent.status).toBe(200);
    expect(sent.body).not.toContain('preview-banner');
    expect(posts.recordView).toHaveBeenCalledWith('live');
  });
});
