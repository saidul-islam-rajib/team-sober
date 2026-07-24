import { Difficulty } from '../tutorial.model';

/*
 * A course written as data: one subject, its chapters, and the lessons inside
 * them, in the order a reader works through them. Keeping it as plain values
 * means a course can be reviewed in a pull request and imported into any
 * environment, rather than being typed into the admin twice.
 *
 * The importer is idempotent, so a course can gain lessons later and be
 * imported again to pick up only what is new.
 */
export interface CourseLesson {
  title: string;
  summary: string;
  difficulty: Difficulty;
  /** Markdown. Rendered exactly as a hand-written lesson is. */
  content: string;
  tags?: string[];
}

export interface CourseChapter {
  title: string;
  summary: string;
  lessons: CourseLesson[];
}

export interface Course {
  /** Matched on import, so re-importing updates rather than duplicates. */
  slug: string;
  title: string;
  summary: string;
  icon: string;
  tags: string[];
  chapters: CourseChapter[];
}

export interface CourseImportResult {
  subjectId: string;
  subjectSlug: string;
  chaptersAdded: number;
  lessonsAdded: number;
  lessonsSkipped: number;
}

export function courseLessonCount(course: Course): number {
  return course.chapters.reduce(
    (total, chapter) => total + chapter.lessons.length,
    0,
  );
}
