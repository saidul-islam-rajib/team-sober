import { avatarMark } from '../layout';
import { aboutPage } from '../../public/about.page';
import { homePage, postPage } from '../../public/posts.pages';
import { EMPTY_ABOUT } from '../../../about/about.model';
import { Post } from '../../../posts/post.model';
import { DEFAULT_SETTINGS } from '../../../settings/settings.model';
import { getSettings, setSettings } from '../../../settings/settings.store';

const post: Post = {
  id: 'p1',
  slug: 'a-post',
  title: 'A post',
  subtitle: '',
  content: 'Body.',
  highlight: '',
  tags: [],
  relatedIds: [],
  status: 'published',
  publishedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  views: 0,
};

const stats = {
  total: 1,
  published: 1,
  drafts: 0,
  scheduled: 0,
  tags: 0,
  views: 0,
  words: 1,
  readingMinutes: 1,
};

describe('zoomable author avatar', () => {
  const before = getSettings();

  beforeEach(() =>
    setSettings({
      ...DEFAULT_SETTINGS,
      avatarUrl: '/uploads/me.jpg',
      authorName: 'Ada',
      showIntro: true,
    }),
  );
  afterAll(() => setSettings(before));

  it('points the lightbox at the original upload, not the thumbnail', () => {
    const html = avatarMark('/uploads/me.jpg', 'Ada', 'mark', true);

    expect(html).toContain('src="/img/me.jpg?w=200"');
    expect(html).toContain('data-zoom="/uploads/me.jpg"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('role="button"');
  });

  it('is off by default, so the nav avatar stays a plain link image', () => {
    expect(avatarMark('/uploads/me.jpg', 'Ada')).not.toContain('data-zoom');
  });

  it('adds nothing zoomable for the initials fallback', () => {
    expect(avatarMark('', 'Ada', 'mark', true)).not.toContain('data-zoom');
  });

  it.each([
    ['home', () => homePage({ posts: [post], tags: [], stats })],
    ['post', () => postPage(post, [], '<p>x</p>')],
    ['about', () => aboutPage(EMPTY_ABOUT, '<p>x</p>', false, [])],
  ])('%s page ships a zoomable avatar with the viewer', (_n, render) => {
    const html = render();

    expect(html).toContain('data-zoom="/uploads/me.jpg"');
    expect(html).toContain("closest('img[data-zoom]')");
    expect(html).toContain('.lightbox {');
    expect(html).toContain('.lightbox img.is-actual');
  });
});
