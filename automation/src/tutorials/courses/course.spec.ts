import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TutorialsService } from '../tutorials.service';
import {
  loadCourses,
  parseFrontMatter,
} from './course.loader';
import { Course } from './course.model';

describe('front matter', () => {
  it('splits the block from the body', () => {
    const { data, body } = parseFrontMatter(
      '---\ntitle: A lesson\nsummary: One line.\n---\n\n## Heading\n\nBody.',
    );

    expect(data.title).toBe('A lesson');
    expect(data.summary).toBe('One line.');
    expect(body).toBe('## Heading\n\nBody.');
  });

  it('keeps colons inside a value', () => {
    const { data } = parseFrontMatter(
      '---\nsummary: DNS: names to addresses\n---\nx',
    );

    expect(data.summary).toBe('DNS: names to addresses');
  });

  it('reads a file written with Windows line endings', () => {
    const { data, body } = parseFrontMatter(
      '---\r\ntitle: A lesson\r\n---\r\n\r\nBody.',
    );

    expect(data.title).toBe('A lesson');
    expect(body).toBe('Body.');
  });

  it('treats a file with no front matter as all body', () => {
    const { data, body } = parseFrontMatter('Just text.');

    expect(data).toEqual({});
    expect(body).toBe('Just text.');
  });
});

describe('course loader', () => {
  it('returns nothing rather than throwing when the directory is absent', () => {
    expect(loadCourses(join(tmpdir(), 'courses-that-do-not-exist'))).toEqual(
      [],
    );
  });
});

describe('importing a course', () => {
  let dir: string;
  let service: TutorialsService;

  const course: Course = {
    slug: 'test-course',
    title: 'Test Course',
    summary: 'A course used by the tests.',
    icon: '🧪',
    tags: ['dsa'],
    chapters: [
      {
        title: 'First chapter',
        summary: 'Chapter summary.',
        lessons: [
          {
            title: 'First lesson',
            summary: 'Lesson summary.',
            difficulty: 'beginner',
            content: '## Heading\n\nBody text.',
            tags: ['arrays'],
          },
          {
            title: 'Second lesson',
            summary: 'Lesson summary.',
            difficulty: 'intermediate',
            content: 'Body text.',
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'course-import-'));
    process.env.DATA_DIR = dir;
    service = new TutorialsService();

    for (const subject of service.findSubjects(true)) {
      service.removeSubject(subject.id);
    }
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates the subject, its chapters and its lessons', () => {
    const result = service.importCourse(course);

    expect(result.chaptersAdded).toBe(1);
    expect(result.lessonsAdded).toBe(2);
    expect(result.lessonsSkipped).toBe(0);

    const lessons = service.lessons(result.subjectId, true);

    expect(lessons.map((lesson) => lesson.title)).toEqual([
      'First lesson',
      'Second lesson',
    ]);
    expect(lessons[0].content).toContain('## Heading');
    expect(lessons[0].difficulty).toBe('beginner');
    expect(lessons[1].difficulty).toBe('intermediate');
  });

  it('keeps the lesson inside its chapter', () => {
    const result = service.importCourse(course);
    const groups = service.chapterGroups(result.subjectId, true);

    expect(groups).toHaveLength(1);
    expect(groups[0].chapter?.title).toBe('First chapter');
    expect(groups[0].lessons).toHaveLength(2);
  });

  it('carries the course tags onto every lesson', () => {
    const result = service.importCourse(course);
    const [first] = service.lessons(result.subjectId, true);

    expect(first.tags).toContain('arrays');
    expect(first.tags).toContain('dsa');
  });

  it('adds nothing on a second import', () => {
    service.importCourse(course);
    const again = service.importCourse(course);

    expect(again.lessonsAdded).toBe(0);
    expect(again.chaptersAdded).toBe(0);
    expect(again.lessonsSkipped).toBe(2);
    expect(service.lessons(again.subjectId, true)).toHaveLength(2);
  });

  it('adds only what the course has gained since last time', () => {
    const first = service.importCourse(course);

    const grown: Course = {
      ...course,
      chapters: [
        ...course.chapters,
        {
          title: 'Second chapter',
          summary: 'Added later.',
          lessons: [
            {
              title: 'Third lesson',
              summary: 'Lesson summary.',
              difficulty: 'advanced',
              content: 'Body text.',
            },
          ],
        },
      ],
    };

    const second = service.importCourse(grown);

    expect(second.subjectId).toBe(first.subjectId);
    expect(second.chaptersAdded).toBe(1);
    expect(second.lessonsAdded).toBe(1);
    expect(second.lessonsSkipped).toBe(2);
  });

  it('leaves an edited lesson exactly as the author left it', () => {
    const result = service.importCourse(course);
    const [first] = service.lessons(result.subjectId, true);

    service.updateTutorial(first.id, {
      subjectId: result.subjectId,
      title: first.title,
      content: 'Rewritten by hand.',
      status: 'draft',
    });

    service.importCourse(course);

    const after = service.findTutorialById(first.id);

    expect(after.content).toBe('Rewritten by hand.');
    expect(after.status).toBe('draft');
    expect(service.lessons(result.subjectId, true)).toHaveLength(2);
  });

  it('gives each lesson a dwell time drawn from its length', () => {
    const result = service.importCourse(course);

    for (const lesson of service.lessons(result.subjectId, true)) {
      expect(lesson.completionSeconds).toBeGreaterThanOrEqual(30);
    }
  });
});
