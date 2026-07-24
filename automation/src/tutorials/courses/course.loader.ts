import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { Course, CourseChapter, CourseLesson } from './course.model';
import { parseDifficulty } from '../tutorial.model';

/*
 * Courses are written as Markdown on disk, one file per lesson, so a lesson can
 * be drafted, reviewed and diffed like any other source file:
 *
 *   content/courses/<course>/course.md            course front matter
 *   content/courses/<course>/01-chapter/_chapter.md
 *   content/courses/<course>/01-chapter/01-lesson.md
 *
 * Numeric filename prefixes set the order readers see; they are not part of any
 * slug. Each file opens with a front matter block:
 *
 *   ---
 *   title: What a data structure actually is
 *   summary: One sentence, shown in the lesson list.
 *   difficulty: beginner
 *   tags: dsa, arrays
 *   ---
 *
 * Everything after it is the lesson body, rendered by the same Markdown
 * pipeline as a lesson typed into the admin.
 */

const FRONT_MATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/;

export interface FrontMatter {
  data: Record<string, string>;
  body: string;
}

export function parseFrontMatter(source: string): FrontMatter {
  const match = FRONT_MATTER.exec(source);

  if (!match) return { data: {}, body: source.trim() };

  const data: Record<string, string> = {};

  for (const line of match[1].split(/\r?\n/)) {
    const at = line.indexOf(':');
    if (at === -1) continue;

    const key = line.slice(0, at).trim();
    if (key) data[key] = line.slice(at + 1).trim();
  }

  return { data, body: source.slice(match[0].length).trim() };
}

function tagList(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

export function contentRoot(): string {
  return process.env.CONTENT_DIR ?? join(process.cwd(), 'content');
}

export function coursesRoot(): string {
  return join(contentRoot(), 'courses');
}

/** Directory entries in filename order, which is the order readers get. */
function ordered(dir: string, wanted: 'dirs' | 'files'): string[] {
  return readdirSync(dir)
    .filter((name) =>
      wanted === 'dirs'
        ? statSync(join(dir, name)).isDirectory()
        : name.endsWith('.md') && !name.startsWith('_'),
    )
    .sort();
}

function readLesson(file: string): CourseLesson {
  const { data, body } = parseFrontMatter(readFileSync(file, 'utf8'));

  if (!data.title) throw new Error(`Lesson has no title in front matter: ${file}`);
  if (!body) throw new Error(`Lesson has no content: ${file}`);

  return {
    title: data.title,
    summary: data.summary ?? '',
    difficulty: parseDifficulty(data.difficulty),
    tags: tagList(data.tags),
    content: body,
  };
}

function readChapter(dir: string): CourseChapter {
  const meta = join(dir, '_chapter.md');

  if (!existsSync(meta)) {
    throw new Error(`Chapter is missing _chapter.md: ${dir}`);
  }

  const { data } = parseFrontMatter(readFileSync(meta, 'utf8'));

  if (!data.title) throw new Error(`Chapter has no title: ${meta}`);

  return {
    title: data.title,
    summary: data.summary ?? '',
    lessons: ordered(dir, 'files').map((name) => readLesson(join(dir, name))),
  };
}

export function loadCourse(dir: string): Course {
  const meta = join(dir, 'course.md');

  if (!existsSync(meta)) {
    throw new Error(`Course is missing course.md: ${dir}`);
  }

  const { data, body } = parseFrontMatter(readFileSync(meta, 'utf8'));

  if (!data.title) throw new Error(`Course has no title: ${meta}`);

  return {
    slug: data.slug || '',
    title: data.title,
    summary: data.summary || body,
    icon: data.icon ?? '',
    tags: tagList(data.tags),
    chapters: ordered(dir, 'dirs').map((name) => readChapter(join(dir, name))),
  };
}

/** Every course found on disk, newest content wins on a redeploy. */
export function loadCourses(root = coursesRoot()): Course[] {
  if (!existsSync(root)) return [];

  return ordered(root, 'dirs').map((name) => loadCourse(join(root, name)));
}

export function findCourse(slug: string, root = coursesRoot()): Course {
  const course = loadCourses(root).find((candidate) => candidate.slug === slug);

  if (!course) throw new Error(`No course with slug "${slug}"`);

  return course;
}
