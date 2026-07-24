import { readFileSync } from 'fs';
import { join } from 'path';
import { TUTORIALS_STYLES } from './public/tutorials.styles';
import { TUTORIALS_ADMIN_STYLES } from './admin/tutorials.styles';
import {
  ACCOUNT_ADMIN_CSS,
  ACCOUNT_PUBLIC_CSS,
} from '../accounts/account.assets';
import { UI_COMPONENTS_CSS } from '../shared/view/ui.assets';
import { PROSE_BUNDLE } from './shared/styles/prose.styles';
import { MARKDOWN_EDITOR_STYLES } from './shared/components/markdown-editor';
import { DATETIME_FIELD_STYLES } from './shared/components/datetime-field';
import {
  subjectPage,
  tutorialPage,
  tutorialsIndexPage,
} from './public/tutorials.page';
import { homePage } from './public/posts.pages';
import { ContentPolicy } from '../shared/config/policies';

const SIDEBAR_TAG_LIMIT = ContentPolicy.sidebarTagLimit;
import {
  chapterEditorPage,
  lessonEditorPage,
  subjectEditorPage,
  subjectLessonsPage,
  tutorialsAdminPage,
} from './admin/tutorials.page';
import { CONDITIONAL_FIELDS_SCRIPT } from './shared/scripts/conditional-fields';
import { SORTABLE_SCRIPT } from './shared/scripts/sortable';
import { PROGRESS_TRACKER_SCRIPT } from './shared/scripts/progress-tracker';
import {
  Difficulty,
  ENROLMENT_POLICIES,
  Subject,
  Tutorial,
} from '../tutorials/tutorial.model';

const subject: Subject = {
  id: 's1',
  slug: 'networking',
  title: 'Networking',
  summary: 'How machines find each other.',
  icon: '🌐',
  order: 1,
  status: 'published',
  enrolment: 'open',
  enrolKey: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const lesson: Tutorial = {
  id: 't1',
  subjectId: 's1',
  chapterId: '',
  completionSeconds: 30,
  slug: 'ip-addresses',
  title: 'What an IP address is',
  summary: 'Addressing and subnets.',
  content: '## Addressing\n\nBody text.',
  difficulty: 'beginner',
  order: 1,
  status: 'published',
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  views: 0,
};

const lessonHtml = (): string =>
  tutorialPage(
    subject,
    lesson,
    [{ lessons: [lesson] }],
    { position: 1, total: 1 },
    '<p>body</p>',
  );

const indexHtml = (difficulties: string[]): string =>
  tutorialsIndexPage(
    [subject],
    new Map([
      [
        subject.id,
        {
          total: difficulties.length,
          minutes: 3,
          difficulties: difficulties as Difficulty[],
        },
      ],
    ]),
    new Map([[subject.id, difficulties.length ? ['a'] : []]]),
    { subjects: 1, tutorials: difficulties.length, minutes: 3 },
  );

const layoutSource = readFileSync(
  join(__dirname, 'shared', 'layout.ts'),
  'utf8',
);

const DEFINED = new Set(
  [...layoutSource.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]),
);

const sheets: [string, string][] = [
  ['public tutorials', TUTORIALS_STYLES],
  ['admin tutorials', TUTORIALS_ADMIN_STYLES],
];

const bundles: [string, string][] = [
  ['ui components', UI_COMPONENTS_CSS],
  ['public accounts', ACCOUNT_PUBLIC_CSS],
  ['admin accounts', ACCOUNT_ADMIN_CSS],
  ['rendered markdown', PROSE_BUNDLE],
  ['markdown editor', MARKDOWN_EDITOR_STYLES],
  ['date and time field', DATETIME_FIELD_STYLES],
];

const allCss: [string, string][] = [...sheets, ...bundles];

describe('stylesheet integrity', () => {
  it('finds the custom properties the layout defines', () => {
    expect(DEFINED.has('--ink')).toBe(true);
    expect(DEFINED.has('--accent')).toBe(true);
    expect(DEFINED.size).toBeGreaterThan(10);
  });

  it.each(allCss)('%s references only defined custom properties', (_n, css) => {
    const used = [...css.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]);
    const unknown = [...new Set(used)].filter((name) => !DEFINED.has(name));

    expect(unknown).toEqual([]);
  });

  it.each(allCss)('%s has balanced braces', (_n, css) => {
    const opens = (css.match(/\{/g) ?? []).length;
    const closes = (css.match(/\}/g) ?? []).length;

    expect(opens).toBe(closes);
  });

  it.each(sheets)('%s emits exactly one style element', (_n, css) => {
    expect((css.match(/<style>/g) ?? []).length).toBe(1);
    expect((css.match(/<\/style>/g) ?? []).length).toBe(1);
  });
});

describe('clickable cards', () => {
  it('stretches the subject title link across the whole card', () => {
    expect(TUTORIALS_STYLES).toContain('.subj-card {\n    position: relative;');
    expect(TUTORIALS_STYLES).toContain(
      '.subj-card h2 a::after { content: ""; position: absolute; inset: 0;',
    );
  });

  it('stretches the lesson title link across the whole row', () => {
    expect(TUTORIALS_STYLES).toContain(
      '.lesson-item {\n    position: relative;',
    );
    expect(TUTORIALS_STYLES).toContain(
      '.lesson-body h3 a::after { content: ""; position: absolute; inset: 0;',
    );
  });

  it('shows the accent border when a card is focused by keyboard', () => {
    expect(TUTORIALS_STYLES).toContain('.subj-card:focus-within');
    expect(TUTORIALS_STYLES).toContain('.lesson-item:focus-within');
  });
});

describe('automatic completion', () => {
  it('places a sentinel at the end of the lesson content', () => {
    const html = lessonHtml();

    const contentAt = html.indexOf('class="prose"');
    const sentinelAt = html.indexOf('data-lesson-end');
    const navAt = html.indexOf('class="tut-nav"');

    expect(sentinelAt).toBeGreaterThan(contentAt);
    expect(sentinelAt).toBeLessThan(navAt);
  });

  it('hides the sentinel from assistive technology', () => {
    expect(lessonHtml()).toContain('aria-hidden="true"');
  });

  it('keeps a manual toggle so a wrong guess can be undone', () => {
    const html = lessonHtml();

    expect(html).toContain('data-mark-done="t1"');
    expect(html).toContain('aria-pressed="false"');
  });

  it('does not explain the completion mechanism to the reader', () => {
    const html = lessonHtml();

    expect(html).not.toContain('Marked complete after');
    expect(html).not.toContain('data-auto-note');
    expect(html).toContain('Mark as complete');
  });

  it('observes the sentinel and marks after a dwell', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain('[data-lesson-end]');
    expect(PROGRESS_TRACKER_SCRIPT).toContain('IntersectionObserver');
  });

  it('takes the dwell from the lesson rather than a fixed constant', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain("getAttribute('data-dwell')");
    expect(lessonHtml()).toContain('data-dwell="30"');
  });

  it('falls back to 30 seconds when the lesson gives no dwell', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain('seconds <= 0 ? 30 : seconds');
  });

  it('cancels the pending mark when the reader scrolls away', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain('window.clearTimeout(timer)');
  });

  it('does not re-mark a lesson the reader has already completed', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain(
      'if (!isDone(id) && timer === null)',
    );
  });

  it('degrades without IntersectionObserver rather than throwing', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain(
      "typeof window.IntersectionObserver === 'function'",
    );
  });
});

describe('difficulty range', () => {
  it('shows a single badge when every lesson is the same level', () => {
    const html = indexHtml(['beginner']);

    expect(html).toContain('>Beginner<');
    expect(html).not.toContain('–');
  });

  it('collapses several levels into one range badge', () => {
    const html = indexHtml(['beginner', 'intermediate', 'advanced']);

    expect(html).toContain('>Beginner–Advanced<');
    expect(html).not.toContain('>Intermediate<');
  });

  it('shows nothing when a subject has no lessons', () => {
    expect(indexHtml([])).not.toContain('class="level');
  });
});

describe('home sidebar tag list', () => {
  const homeWith = (count: number): string => {
    const tags = Array.from({ length: count }, (_, i) => ({
      tag: `tag-${String(i).padStart(2, '0')}`,
      count: count - i,
    }));

    return homePage({
      posts: [],
      tags,
      stats: {
        published: 1,
        tags: count,
        words: 10,
        readingMinutes: 1,
      },
    });
  };

  const tagLinks = (html: string): string[] => {
    const side = html.slice(html.indexOf('Browse tags'));
    return [...side.matchAll(/class="tag" href="\/tag\/([^"]+)"/g)].map(
      (m) => m[1],
    );
  };

  it(`shows at most ${SIDEBAR_TAG_LIMIT} tags`, () => {
    expect(tagLinks(homeWith(63))).toHaveLength(SIDEBAR_TAG_LIMIT);
  });

  it('shows the most used tags, not an arbitrary slice', () => {
    const shown = tagLinks(homeWith(63));

    expect(shown[0]).toBe('tag-00');
    expect(shown).not.toContain('tag-62');
  });

  it('links to the tags page with the full count when truncated', () => {
    expect(homeWith(63)).toContain('See all 63 tags →');
    expect(homeWith(63)).toContain('class="rail-more" href="/tags"');
  });

  it('shows every tag and no link when the list is short', () => {
    const html = homeWith(5);

    expect(tagLinks(html)).toHaveLength(5);
    expect(html).not.toContain('class="rail-more" href');
  });

  it('shows no link at exactly the limit', () => {
    const html = homeWith(SIDEBAR_TAG_LIMIT);

    expect(tagLinks(html)).toHaveLength(SIDEBAR_TAG_LIMIT);
    expect(html).not.toContain('class="rail-more" href');
  });

  it('handles having no tags at all', () => {
    const html = homeWith(0);

    expect(html).toContain('No tags yet.');
    expect(html).not.toContain('class="rail-more" href');
  });
});

describe('social share cards', () => {
  const tutorialsHtml = (): string =>
    tutorialsIndexPage(
      [subject],
      new Map([
        [subject.id, { total: 1, minutes: 3, difficulties: ['beginner'] }],
      ]),
      new Map([[subject.id, [lesson.id]]]),
      { subjects: 1, tutorials: 1, minutes: 3 },
    );

  const homeHtml = (over: Record<string, unknown> = {}): string =>
    homePage({
      posts: [],
      tags: [],
      stats: { published: 1, tags: 0, words: 0, readingMinutes: 0 },
      ...over,
    });

  it('gives the tutorials page its generated course card', () => {
    const html = tutorialsHtml();

    expect(html).toContain(
      '<meta property="og:image" content="https://team-sober.com/og/tutorials.png" />',
    );
    expect(html).toContain('<meta property="og:image:width" content="1200" />');
    expect(html).toContain('<meta property="og:image:height" content="630" />');
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image" />',
    );
  });

  it('gives the home feed its own card', () => {
    expect(homeHtml()).toContain(
      '<meta property="og:image" content="https://team-sober.com/og/home.png" />',
    );
  });

  it('does not put the home card on tag or search views', () => {
    expect(homeHtml({ activeTag: 'docker' })).not.toContain('/og/home.png');
    expect(homeHtml({ query: 'redis' })).not.toContain('/og/home.png');
  });
});

describe('script placement', () => {
  const pages: [string, () => string][] = [
    [
      'tutorials index',
      () =>
        tutorialsIndexPage(
          [subject],
          new Map([
            [subject.id, { total: 1, minutes: 3, difficulties: ['beginner'] }],
          ]),
          new Map([[subject.id, [lesson.id]]]),
          { subjects: 1, tutorials: 1, minutes: 3 },
        ),
    ],
    ['tutorial lesson', () => lessonHtml()],
    [
      'tutorials admin',
      () =>
        tutorialsAdminPage(
          [subject],
          new Map([
            [subject.id, { total: 1, minutes: 3, difficulties: ['beginner'] }],
          ]),
          new Map([[subject.id, 0]]),
        ),
    ],
    [
      'subject lessons admin',
      () => subjectLessonsPage(subject, [{ lessons: [lesson] }]),
    ],
  ];

  it.each(pages)('%s runs its scripts after the body exists', (_n, render) => {
    const html = render();
    const headEnd = html.indexOf('</head>');

    expect(headEnd).toBeGreaterThan(-1);

    const scripts = [...html.matchAll(/<script>/g)].map((m) => m.index ?? -1);

    expect(scripts.length).toBeGreaterThan(0);

    for (const at of scripts) {
      expect(at).toBeGreaterThan(headEnd);
    }
  });

  it('gives the completion sentinel a measurable height', () => {
    expect(lessonHtml()).toContain('class="lesson-end" data-lesson-end');
    expect(TUTORIALS_STYLES).toContain('.lesson-end { height: 1px;');
  });
});

describe('student course overview', () => {
  const subjectHtml = (locked = false): string =>
    subjectPage(
      subject,
      [{ chapter: undefined, lessons: [lesson] }],
      { total: 1, minutes: 3, difficulties: ['beginner'] },
      { locked },
    );

  it('offers a resume link carrying the lesson ids and urls', () => {
    const html = subjectHtml();

    expect(html).toContain('data-resume="t1"');
    expect(html).toContain('data-resume-urls="/tutorials/networking/');
    expect(html).toContain('Start the course');
  });

  it('picks the first unread lesson', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain('if (!isDone(ids[i]))');
    expect(PROGRESS_TRACKER_SCRIPT).toContain('Continue where you left off');
  });

  it('offers a restart once every lesson is done', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain('Read again from the start');
  });

  it('counts progress per chapter', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain('[data-chapter-of]');
    expect(PROGRESS_TRACKER_SCRIPT).toContain("classList.toggle('complete'");
  });

  it('hides progress and resume behind an enrolment key', () => {
    const html = subjectHtml(true);

    expect(html).toContain('Enrolment key needed');
    expect(html).not.toContain('data-resume=');
    expect(html).not.toContain('data-progress-for=');
  });
});

describe('completion time field', () => {
  const editor = (seconds?: number): string =>
    lessonEditorPage(
      [subject],
      subject,
      seconds === undefined
        ? undefined
        : { ...lesson, completionSeconds: seconds },
    );

  it('labels the value with its unit rather than in the label text', () => {
    const html = editor();

    expect(html).toContain('Counts as read after');
    expect(html).toContain('<span class="unit">seconds</span>');
  });

  it('restates the number in plain terms', () => {
    expect(editor(30)).toContain('about 30 seconds of reading');
    expect(editor(600)).toContain('about 10 minutes of reading');
    expect(editor(60)).toContain('about 1 minute of reading');
  });

  it('offers common values without forcing them', () => {
    const html = editor();

    expect(html).toContain('list="dwell-presets"');
    expect(html).toContain('<option value="300">');
    expect(html).toContain('type="number"');
  });

  it('defaults a new lesson to thirty seconds', () => {
    expect(editor()).toContain('value="30"');
  });
});

describe('enrolment policy field', () => {
  const editor = (s?: Subject): string => subjectEditorPage(s);

  it('renders one option per policy, from the policy list', () => {
    const html = editor();

    for (const policy of ENROLMENT_POLICIES) {
      expect(html).toContain(`value="${policy.value}"`);
      expect(html).toContain(policy.label);
    }
  });

  it('carries what each option reveals as data, not as a hardcoded check', () => {
    const html = editor();

    for (const policy of ENROLMENT_POLICIES) {
      expect(html).toContain(
        `value="${policy.value}" data-reveals="${policy.reveals}"`,
      );
    }
  });

  it('hides the key field for a policy that does not need one', () => {
    expect(editor()).toContain('id="enrol-key-field" hidden');
  });

  it('shows the key field for a policy that needs one', () => {
    const html = editor({ ...subject, enrolment: 'key', enrolKey: 'autumn' });

    expect(html).toContain('id="enrol-key-field" ');
    expect(html).not.toContain('id="enrol-key-field" hidden');
  });

  it('shows the hint belonging to the selected policy', () => {
    expect(editor()).toContain(ENROLMENT_POLICIES[0].hint);
    expect(editor({ ...subject, enrolment: 'key' })).toContain(
      ENROLMENT_POLICIES[1].hint,
    );
  });

  it('toggles purely from the data attributes', () => {
    expect(CONDITIONAL_FIELDS_SCRIPT).toContain("getAttribute('data-reveals')");
    expect(CONDITIONAL_FIELDS_SCRIPT).not.toContain("'key'");
    expect(CONDITIONAL_FIELDS_SCRIPT).not.toContain('enrol');
  });
});

describe('reordering chapters and lessons', () => {
  const chapter = {
    id: 'c1',
    subjectId: subject.id,
    title: 'Addressing',
    summary: 'How a machine is identified.',
    order: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const page = (): string =>
    subjectLessonsPage(subject, [
      { lessons: [{ ...lesson, id: 'loose' }] },
      { chapter, lessons: [lesson] },
    ]);

  it('makes each chapter block a draggable item', () => {
    const html = page();

    expect(html).toContain('<div data-sortable="chapters">');
    expect(html).toContain(`data-sort-id="${chapter.id}"`);
  });

  it('drags a chapter by its bar, not by its lessons', () => {
    expect(page()).toContain(
      '<div class="chapter-bar" draggable="true" data-sort-handle>',
    );
  });

  it('leaves the loose lessons block where it is', () => {
    const html = page();
    const from = html.indexOf('chapter-bar loose');
    const loose = html.slice(from, html.indexOf('</section>', from));

    expect(loose).not.toContain('data-sort-handle');
    expect(html.match(/data-sort-id="c1"/g)).toHaveLength(1);
  });

  it('gives each chapter its own lesson list', () => {
    expect(page().match(/data-sortable="lessons"/g)).toHaveLength(2);
  });

  it('posts each order to its own endpoint', () => {
    const html = page();

    expect(html).toContain(
      `action="/admin/tutorials/subjects/${subject.id}/reorder"\n        data-sortable-form="lessons"`,
    );
    expect(html).toContain(
      `action="/admin/tutorials/subjects/${subject.id}/chapters/reorder"\n        data-sortable-form="chapters"`,
    );
  });

  it('keeps the arrows as a keyboard-reachable alternative', () => {
    const html = page();

    expect(html).toContain('/admin/tutorials/chapters/c1/move');
    expect(html).toContain('title="Move chapter up"');
  });

  it('confines a drag to the list it started in', () => {
    expect(SORTABLE_SCRIPT).toContain('owner.container !== origin');
  });

  it('submits one combined order for lists sharing a name', () => {
    expect(SORTABLE_SCRIPT).toContain('groupOf(container) !== group');
    expect(SORTABLE_SCRIPT).toContain("ids.join(',')");
  });

  it('starts a drag from the handle when an item nominates one', () => {
    expect(SORTABLE_SCRIPT).toContain(
      "owner.item.querySelector('[data-sort-handle]') && !handle",
    );
  });
});

describe('lessons inside the chapter editor', () => {
  const chapter = {
    id: 'c1',
    subjectId: subject.id,
    title: 'Addressing',
    summary: 'How a machine is identified.',
    order: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const editing = (lessons: Tutorial[] = [], flash?: string): string =>
    chapterEditorPage(subject, chapter, lessons, flash);

  it('offers nothing to add before the chapter exists', () => {
    const html = chapterEditorPage(subject);

    expect(html).not.toContain('<details class="chapter-lessons"');
    expect(html).not.toContain('/lessons"');
    expect(html).toContain('Save the chapter and you can add its lessons here');
  });

  it('collapses the lesson list, open by default', () => {
    const html = editing([lesson]);

    expect(html).toContain('<details class="chapter-lessons" open>');
    expect(html).toContain('Lessons in this chapter');
  });

  it('counts the lessons in the summary and the subtitle', () => {
    const html = editing([lesson, { ...lesson, id: 't2', title: 'Second' }]);

    expect(html).toContain('<span class="count">2</span>');
    expect(html).toContain('2 lessons in this chapter.');
  });

  it('lists each lesson with a way to open it', () => {
    const html = editing([lesson]);

    expect(html).toContain('What an IP address is');
    expect(html).toContain('href="/admin/tutorials/lessons/t1/edit"');
  });

  it('flags a lesson that has no content yet', () => {
    const html = editing([{ ...lesson, content: '' }]);

    expect(html).toContain('no content yet');
  });

  it('adds a lesson straight into this chapter', () => {
    const html = editing([]);

    expect(html).toContain('action="/admin/tutorials/chapters/c1/lessons"');
    expect(html).toContain('name="title"');
    expect(html).toContain('name="difficulty"');
    expect(html).toContain('Added as a draft at the end of this chapter.');
  });

  it('says where to go when the chapter is still empty', () => {
    expect(editing([])).toContain('No lessons yet. Add the first one below.');
  });

  it('keeps a route to the full editor, scoped to this chapter', () => {
    expect(editing([])).toContain(
      `href="/admin/tutorials/subjects/${subject.id}/lessons/new?chapterId=c1"`,
    );
  });

  it('preselects that chapter in the full editor', () => {
    const html = lessonEditorPage(
      [subject],
      subject,
      undefined,
      [chapter],
      'c1',
    );

    expect(html).toContain('<option value="c1" selected>Addressing</option>');
    expect(html).not.toContain('<option value="" selected>No chapter</option>');
  });

  it('shows what just happened', () => {
    expect(editing([], 'Chapter created. Add its lessons below.')).toContain(
      '<div class="flash ok">Chapter created. Add its lessons below.</div>',
    );
  });
});

describe('lesson tags', () => {
  const editor = (): string => lessonEditorPage([subject], subject, lesson);

  it('uses the chip input the post and project editors use', () => {
    const html = editor();

    expect(html).toContain(
      'class="chip-input" id="tags-box" data-target="tags"',
    );
    expect(html).toContain('data-sep="comma"');
    expect(html).toContain('<input type="hidden" id="tags" name="tags"');
  });

  it('keeps posting the same comma separated value', () => {
    expect(
      lessonEditorPage([subject], subject, {
        ...lesson,
        tags: ['networking', 'dns'],
      }),
    ).toContain('name="tags" value="networking, dns"');
  });

  it('ships the chip script and its styles', () => {
    expect(editor()).toContain('.chip-input {');
    expect(editor()).toContain("querySelectorAll('.chip-input')");
  });
});
