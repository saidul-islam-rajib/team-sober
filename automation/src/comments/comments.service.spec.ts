import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { CommentsService } from './comments.service';

const INPUT = {
  postId: 'post-1',
  postSlug: 'hello-world',
  accountId: 'account-1',
  authorName: 'Ada Lovelace',
  body: 'Great post!',
};

describe('CommentsService', () => {
  let dir: string;
  let service: CommentsService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'comments-test-'));
    process.env.DATA_DIR = dir;
    service = new CommentsService();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  it('adds a comment and lists it under its post', () => {
    const result = service.add(INPUT);

    expect(result.ok).toBe(true);
    expect(service.forPost('hello-world')).toHaveLength(1);
    expect(service.forPost('hello-world')[0].body).toBe('Great post!');
  });

  it('rejects an empty or whitespace-only comment', () => {
    const result = service.add({ ...INPUT, body: '   ' });

    expect(result.ok).toBe(false);
  });

  it('rejects a comment over the configured length limit', () => {
    const result = service.add({ ...INPUT, body: 'x'.repeat(5000) });

    expect(result.ok).toBe(false);
  });

  it('throttles a second comment from the same account within the cooldown', () => {
    const now = Date.now();
    const first = service.add(INPUT, now);
    const second = service.add({ ...INPUT, body: 'again' }, now + 1000);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
  });

  it('allows a second comment once the cooldown has passed', () => {
    const now = Date.now();
    service.add(INPUT, now);
    const second = service.add({ ...INPUT, body: 'later' }, now + 3_600_000);

    expect(second.ok).toBe(true);
  });

  it('does not throttle across different accounts', () => {
    const now = Date.now();
    service.add(INPUT, now);
    const other = service.add(
      { ...INPUT, accountId: 'account-2', body: 'me too' },
      now + 1000,
    );

    expect(other.ok).toBe(true);
  });

  it('hides a comment without deleting it', () => {
    const result = service.add(INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    service.setHidden(result.comment.id, true);

    expect(service.forPost('hello-world')).toHaveLength(0);
    expect(service.all()).toHaveLength(1);
  });

  it('unhides a comment', () => {
    const result = service.add(INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    service.setHidden(result.comment.id, true);
    service.setHidden(result.comment.id, false);

    expect(service.forPost('hello-world')).toHaveLength(1);
  });

  it('deletes a comment permanently', () => {
    const result = service.add(INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    service.remove(result.comment.id);

    expect(service.all()).toHaveLength(0);
  });

  it('lists newest first across all posts, ignoring hidden state', () => {
    const now = Date.now();
    service.add(INPUT, now);
    service.add(
      { ...INPUT, postSlug: 'second-post', accountId: 'account-2' },
      now + 3_600_000,
    );

    const all = service.all();
    expect(all).toHaveLength(2);
    expect(all[0].postSlug).toBe('second-post');
  });
});
