import { Script } from 'vm';
import {
  MARKDOWN_EDITOR_SCRIPT,
  MARKDOWN_EDITOR_STYLES,
  markdownEditor,
} from './markdown-editor';
import {
  DATETIME_FIELD_SCRIPT,
  DATETIME_FIELD_STYLES,
  dateTimeField,
} from './datetime-field';
import { editorPage } from '../../admin/posts.pages';
import { lessonEditorPage } from '../../admin/tutorials.page';
import { projectEditorPage } from '../../admin/projects.page';
import { tutorialPage } from '../../public/tutorials.page';
import { postPage } from '../../public/posts.pages';
import { projectDetailPage } from '../../public/projects.page';
import { DETAILED_WORD_LIMIT, Project } from '../../../projects/project.model';
import { Post, toLocalInput } from '../../../posts/post.model';
import { Subject, Tutorial } from '../../../tutorials/tutorial.model';

const post: Post = {
  id: 'p1',
  slug: 'a-post',
  title: 'A post',
  subtitle: '',
  content: '# Heading\n\n![shot](/uploads/a.png)',
  highlight: '',
  tags: [],
  relatedIds: [],
  status: 'published',
  publishedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  views: 0,
};

const subject: Subject = {
  id: 's1',
  slug: 'networking',
  title: 'Networking',
  summary: '',
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
  summary: '',
  content: '## Addressing\n\n![diagram](/uploads/ip.png)',
  difficulty: 'beginner',
  order: 1,
  status: 'published',
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  views: 0,
};

const project: Project = {
  id: 'j1',
  slug: 'a-project',
  title: 'A project',
  description: 'Short.',
  detailedDescription: 'Long.',
  showShort: true,
  showDetailed: true,
  coverUrl: '',
  repoUrl: '',
  demoUrl: '',
  technologies: [],
  tags: [],
  keywords: [],
  topics: [],
  year: '2026',
  startDate: '',
  endDate: '',
  status: 'completed',
  featured: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const count = (html: string, needle: string): number =>
  html.split(needle).length - 1;

/*
 * The three long-form editors are the reason this component exists: a change to
 * the toolbar, the uploader or the preview has to reach all of them at once.
 */
const editors: [string, () => string][] = [
  ['post body', () => editorPage(post)],
  ['lesson content', () => lessonEditorPage([subject], subject, lesson)],
  ['project write-up', () => projectEditorPage(project)],
];

describe('markdown editor', () => {
  it.each(editors)('%s uses the shared editor', (_name, render) => {
    const html = render();

    expect(count(html, 'data-md-editor>')).toBe(1);
    expect(html).toContain('data-md-input');
    expect(html).toContain('class="md-toolbar"');
  });

  it.each(editors)('%s can upload and drop images', (_name, render) => {
    const html = render();

    expect(html).toContain('data-md-image');
    expect(html).toContain('data-md-file');
    expect(html).toContain('accept="image/*"');
  });

  it.each(editors)('%s can preview what readers will see', (_name, render) => {
    const html = render();

    expect(html).toContain('data-md-preview-toggle');
    expect(html).toContain('class="md-preview prose"');
  });

  it.each(editors)('%s offers the same formatting actions', (_name, render) => {
    const html = render();

    for (const action of [
      'bold',
      'italic',
      'highlight',
      'h2',
      'h3',
      'link',
      'code',
      'codeblock',
      'quote',
      'ul',
      'ol',
      'hr',
      'cols2',
      'cols3',
    ]) {
      expect(html).toContain(`data-md="${action}"`);
    }
  });

  it.each(editors)('%s explains the markup it accepts', (_name, render) => {
    expect(render()).toContain('Markdown reference');
  });

  it.each(editors)('%s loads the editor script once', (_name, render) => {
    expect(count(render(), "querySelectorAll('[data-md-editor]')")).toBe(1);
  });

  it('binds every editor on the page rather than one fixed field', () => {
    expect(MARKDOWN_EDITOR_SCRIPT).toContain(
      "document.querySelectorAll('[data-md-editor]').forEach(bind)",
    );
    expect(MARKDOWN_EDITOR_SCRIPT).not.toContain("getElementById('content')");
  });

  it('keeps the field name, id and required flag the form needs', () => {
    const html = markdownEditor({
      id: 'content',
      name: 'body',
      label: 'Content',
      required: true,
    });

    expect(html).toContain('id="content"');
    expect(html).toContain('name="body"');
    expect(html).toContain('required');
  });

  it('escapes the value it renders back into the textarea', () => {
    const html = markdownEditor({
      id: 'content',
      label: 'Content',
      value: '</textarea><script>alert(1)</script>',
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;/textarea&gt;');
  });

  it('counts against a word cap when the field has one', () => {
    const html = markdownEditor({
      id: 'detailedDescription',
      label: 'Detailed description',
      limit: 400,
    });

    expect(html).toContain('data-limit="400"');
    expect(html).toContain('class="word-count" data-for="detailedDescription"');
    expect(html).not.toContain('data-md-readout');
  });

  it('reports words and reading time when there is no cap', () => {
    const html = markdownEditor({ id: 'content', label: 'Body' });

    expect(html).toContain('data-md-readout');
    expect(html).not.toContain('data-limit');
  });

  it('caps the project write-up at the limit the service enforces', () => {
    expect(projectEditorPage(project)).toContain(
      `data-limit="${DETAILED_WORD_LIMIT}"`,
    );
  });
});

describe('date and time field', () => {
  const editor = (): string => editorPage(post);

  it('replaces the raw datetime-local input', () => {
    const html = editor();

    expect(html).not.toContain('type="datetime-local"');
    expect(html).toContain('type="date"');
    expect(html).toContain('type="time"');
  });

  it('posts one combined value under the original field name', () => {
    const html = dateTimeField({
      name: 'publishedAt',
      label: 'Publish date and time',
      value: '2026-07-24T16:55',
    });

    expect(html).toContain(
      '<input type="hidden" id="publishedAt" name="publishedAt"',
    );
    expect(html).toContain('value="2026-07-24T16:55" data-datetime-value');
    expect(count(html, 'name="publishedAt"')).toBe(1);
  });

  it('splits the value across the date and time inputs', () => {
    const html = dateTimeField({
      name: 'publishedAt',
      label: 'Publish',
      value: '2026-07-24T16:55',
    });

    expect(html).toContain(
      'type="date" id="publishedAt-date" value="2026-07-24"',
    );
    expect(html).toContain('type="time" id="publishedAt-time" value="16:55"');
  });

  it('reads the moment back in words without waiting for script', () => {
    const html = dateTimeField({
      name: 'publishedAt',
      label: 'Publish',
      value: '2026-07-24T16:55',
    });

    expect(html).toMatch(/data-datetime-readout>Fri, Jul 24, 2026.*4:55 PM</);
  });

  it('says so when there is no date at all', () => {
    const html = dateTimeField({ name: 'at', label: 'When', value: '' });

    expect(html).toContain('>No date set<');
  });

  it('offers the times an admin actually picks', () => {
    const html = editor();

    expect(html).toContain('data-datetime-preset="now"');
    expect(html).toContain('data-datetime-preset="tomorrow"');
    expect(html).toContain('data-datetime-preset="monday"');
    expect(html).toContain('data-datetime-preset="week"');
  });

  it('labels the state in the words of the page using it', () => {
    expect(editor()).toContain(
      'data-future-label="Scheduled" data-past-label="Live"',
    );
  });

  it('shows the post its own publish time', () => {
    expect(editor()).toContain(`value="${toLocalInput(post.publishedAt)}"`);
  });

  it('tells the page when the value moves, so hints can follow', () => {
    expect(DATETIME_FIELD_SCRIPT).toContain(
      "hidden.dispatchEvent(new Event('change', { bubbles: true }))",
    );
    expect(editor()).toContain('id="schedule-hint"');
  });
});

describe('rendered markdown', () => {
  const pages: [string, () => string][] = [
    ['post', () => postPage(post, [], '<p>x</p>')],
    [
      'lesson',
      () =>
        tutorialPage(
          subject,
          lesson,
          [{ lessons: [lesson] }],
          { position: 1, total: 1 },
          '<p>x</p>',
        ),
    ],
    ['project', () => projectDetailPage(project, [], '<p>x</p>')],
  ];

  it.each(pages)(
    '%s styles images, links and code the same way',
    (_n, render) => {
      const html = render();

      expect(html).toContain('.prose img {');
      expect(html).toContain('.prose a { color: var(--accent)');
      expect(html).toContain('.prose pre {');
    },
  );

  it.each(pages)('%s lays out :::columns blocks', (_n, render) => {
    expect(render()).toContain('.md-columns {');
  });

  it.each(pages)('%s opens images full size on click', (_n, render) => {
    const html = render();

    expect(html).toContain('.lightbox {');
    expect(html).toContain("closest('.prose img')");
  });

  it.each(pages)('%s defines the prose rules exactly once', (_n, render) => {
    expect(count(render(), '.prose img {')).toBe(1);
  });

  it('fades in lesson images like post images', () => {
    const html = tutorialPage(
      subject,
      lesson,
      [{ lessons: [lesson] }],
      { position: 1, total: 1 },
      '<p>x</p>',
    );

    expect(html).toContain('@keyframes skel-sweep');
  });
});

describe('inline scripts', () => {
  const scripts: [string, string][] = [
    ['markdown editor', MARKDOWN_EDITOR_SCRIPT],
    ['date and time field', DATETIME_FIELD_SCRIPT],
  ];

  it.each(scripts)('%s parses as JavaScript', (_name, script) => {
    const source = /<script>([\s\S]*)<\/script>/.exec(script)?.[1] ?? '';

    expect(source.length).toBeGreaterThan(0);
    expect(() => new Script(source)).not.toThrow();
  });

  it.each(scripts)('%s ships no style element of its own', (_n, script) => {
    expect(script).not.toContain('<style>');
  });
});

describe('component stylesheets', () => {
  const sheets: [string, string][] = [
    ['markdown editor', MARKDOWN_EDITOR_STYLES],
    ['date and time field', DATETIME_FIELD_STYLES],
  ];

  it.each(sheets)('%s composes into a page sheet', (_n, css) => {
    expect(css).not.toContain('<style>');
    expect((css.match(/\{/g) ?? []).length).toBe(
      (css.match(/\}/g) ?? []).length,
    );
  });
});
