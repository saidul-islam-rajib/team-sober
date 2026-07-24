import { Logger } from '@nestjs/common';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { Course, CourseChapter, CourseLesson } from './course.model';
import { parseDifficulty } from '../tutorial.model';

const logger = new Logger('CourseLoader');

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

function ordered(dir: string, wanted: 'dirs' | 'files'): string[] {
  let entries: string[];

  try {
    entries = readdirSync(dir);
  } catch (error) {
    logger.warn(`Could not read ${dir}: ${(error as Error).message}`);
    return [];
  }

  return entries
    .filter((name) => {
      try {
        return wanted === 'dirs'
          ? statSync(join(dir, name)).isDirectory()
          : name.endsWith('.md') && !name.startsWith('_');
      } catch {
        return false;
      }
    })
    .sort();
}

function readLesson(file: string): CourseLesson | null {
  let source: string;

  try {
    source = readFileSync(file, 'utf8');
  } catch (error) {
    logger.warn(
      `Skipping lesson, could not read ${file}: ${(error as Error).message}`,
    );
    return null;
  }

  const { data, body } = parseFrontMatter(source);

  if (!data.title) {
    logger.warn(`Skipping lesson with no title in front matter: ${file}`);
    return null;
  }

  if (!body) {
    logger.warn(`Skipping lesson with no content: ${file}`);
    return null;
  }

  return {
    title: data.title,
    summary: data.summary ?? '',
    difficulty: parseDifficulty(data.difficulty),
    tags: tagList(data.tags),
    content: body,
  };
}

function readChapter(dir: string): CourseChapter | null {
  const meta = join(dir, '_chapter.md');

  if (!existsSync(meta)) {
    logger.warn(`Skipping chapter with no _chapter.md: ${dir}`);
    return null;
  }

  let source: string;

  try {
    source = readFileSync(meta, 'utf8');
  } catch (error) {
    logger.warn(
      `Skipping chapter, could not read ${meta}: ${(error as Error).message}`,
    );
    return null;
  }

  const { data } = parseFrontMatter(source);

  if (!data.title) {
    logger.warn(`Skipping chapter with no title: ${meta}`);
    return null;
  }

  const lessons = ordered(dir, 'files')
    .map((name) => readLesson(join(dir, name)))
    .filter((lesson): lesson is CourseLesson => lesson !== null);

  return {
    title: data.title,
    summary: data.summary ?? '',
    lessons,
  };
}

export function loadCourse(dir: string): Course | null {
  const meta = join(dir, 'course.md');

  if (!existsSync(meta)) return null;

  let source: string;

  try {
    source = readFileSync(meta, 'utf8');
  } catch (error) {
    logger.warn(
      `Skipping course, could not read ${meta}: ${(error as Error).message}`,
    );
    return null;
  }

  const { data, body } = parseFrontMatter(source);

  if (!data.title) {
    logger.warn(`Skipping course with no title: ${meta}`);
    return null;
  }

  const chapters = ordered(dir, 'dirs')
    .map((name) => readChapter(join(dir, name)))
    .filter((chapter): chapter is CourseChapter => chapter !== null);

  return {
    slug: data.slug || '',
    title: data.title,
    summary: data.summary || body,
    icon: data.icon ?? '',
    tags: tagList(data.tags),
    chapters,
  };
}

/** Every course found on disk. Never throws; a bad course is skipped. */
export function loadCourses(root = coursesRoot()): Course[] {
  if (!existsSync(root)) return [];

  return ordered(root, 'dirs')
    .map((name) => loadCourse(join(root, name)))
    .filter(
      (course): course is Course => course !== null && course.slug !== '',
    );
}

export function findCourse(slug: string, root = coursesRoot()): Course | null {
  return loadCourses(root).find((candidate) => candidate.slug === slug) ?? null;
}
