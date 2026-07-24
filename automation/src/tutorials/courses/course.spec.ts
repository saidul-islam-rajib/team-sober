import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TutorialsService } from '../tutorials.service';
import {
  coursesRoot,
  findCourse,
  loadCourse,
  loadCourses,
  parseFrontMatter,
} from './course.loader';
import { Course, courseLessonCount } from './course.model';
import { slugify } from '../../posts/post.model';

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

describe('courses on disk', () => {
  const courses = loadCourses();

  it('finds at least one course to import', () => {
    expect(courses.length).toBeGreaterThan(0);
  });

  it.each(courses.map((course): [string, Course] => [course.title, course]))(
    '%s carries the fields a subject needs',
    (_name, course) => {
      expect(course.slug).toMatch(/^[a-z0-9-]+$/);
      expect(course.title.length).toBeGreaterThan(0);
      expect(course.summary.length).toBeGreaterThan(20);
      expect(course.icon.length).toBeGreaterThan(0);
    },
  );

  it.each(courses.map((course): [string, Course] => [course.title, course]))(
    '%s gives every lesson a title, summary and body',
    (_name, course) => {
      for (const chapter of course.chapters) {
        expect(chapter.title.length).toBeGreaterThan(0);
        expect(chapter.summary.length).toBeGreaterThan(0);
        expect(chapter.lessons.length).toBeGreaterThan(0);

        for (const lesson of chapter.lessons) {
          expect(lesson.title.length).toBeGreaterThan(0);
          expect(lesson.summary.length).toBeGreaterThan(0);
          expect(lesson.content.length).toBeGreaterThan(200);
          expect(['beginner', 'intermediate', 'advanced']).toContain(
            lesson.difficulty,
          );
        }
      }
    },
  );

  it.each(courses.map((course): [string, Course] => [course.title, course]))(
    '%s keeps every lesson title unique, so no slug collides',
    (_name, course) => {
      const slugs = course.chapters
        .flatMap((chapter) => chapter.lessons)
        .map((lesson) => slugify(lesson.title));

      expect(new Set(slugs).size).toBe(slugs.length);
    },
  );

  it.each(courses.map((course): [string, Course] => [course.title, course]))(
    '%s closes every code fence it opens',
    (_name, course) => {
      for (const chapter of course.chapters) {
        for (const lesson of chapter.lessons) {
          const fences = lesson.content.match(/^```/gm) ?? [];

          expect(fences.length % 2).toBe(0);
        }
      }
    },
  );

  it('reads a course by slug and rejects an unknown one', () => {
    expect(findCourse(courses[0].slug).title).toBe(courses[0].title);
    expect(() => findCourse('no-such-course')).toThrow(/no-such-course/);
  });

  it('returns nothing rather than throwing when the directory is absent', () => {
    expect(loadCourses(join(tmpdir(), 'courses-that-do-not-exist'))).toEqual(
      [],
    );
  });
});

describe('the data structures and algorithms course', () => {
  const course = loadCourse(
    join(coursesRoot(), 'data-structures-and-algorithms'),
  );

  it('covers every chapter of the syllabus', () => {
    expect(course.chapters).toHaveLength(15);
  });

  it('holds at least five lessons in each chapter', () => {
    for (const chapter of course.chapters) {
      expect(chapter.lessons.length).toBeGreaterThanOrEqual(5);
    }

    expect(courseLessonCount(course)).toBeGreaterThanOrEqual(75);
  });

  it('starts where a reader starts', () => {
    expect(course.chapters[0].title).toContain('Introduction');
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
