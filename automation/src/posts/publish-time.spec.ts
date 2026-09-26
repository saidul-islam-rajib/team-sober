import {
  CLOCK_SKEW_MS,
  isScheduled,
  parsePublishedAt,
  Post,
} from './post.model';

const base: Post = {
  id: 'p1',
  slug: 'a',
  title: 'A',
  subtitle: '',
  content: '',
  highlight: '',
  tags: [],
  relatedIds: [],
  status: 'published',
  publishedAt: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  views: 0,
};

describe('parsePublishedAt', () => {
  it('keeps an instant with a timezone exactly', () => {
    expect(parsePublishedAt('2026-09-26T10:09:00.000Z')).toBe(
      '2026-09-26T10:09:00.000Z',
    );
    expect(parsePublishedAt('2026-09-26T16:09:00+06:00')).toBe(
      '2026-09-26T10:09:00.000Z',
    );
  });

  it('treats a moment a few seconds ahead as now, so "Now" publishes', () => {
    const ahead = new Date(Date.now() + 30_000).toISOString();
    const post = { ...base, publishedAt: parsePublishedAt(ahead) };

    expect(isScheduled(post)).toBe(false);
  });

  it('still schedules anything beyond the clock-skew allowance', () => {
    const later = new Date(Date.now() + CLOCK_SKEW_MS + 60_000).toISOString();
    const post = { ...base, publishedAt: parsePublishedAt(later) };

    expect(post.publishedAt).toBe(later);
    expect(isScheduled(post)).toBe(true);
  });

  it('falls back when the value is empty or unreadable', () => {
    expect(parsePublishedAt('', '2026-01-01T00:00:00.000Z')).toBe(
      '2026-01-01T00:00:00.000Z',
    );
    expect(parsePublishedAt('nonsense', '2026-01-01T00:00:00.000Z')).toBe(
      '2026-01-01T00:00:00.000Z',
    );
  });
});
