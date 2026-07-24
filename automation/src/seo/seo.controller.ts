import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import sharp from 'sharp';
import { PostsService } from '../posts/posts.service';
import { ProjectsService } from '../projects/projects.service';
import { SettingsService } from '../settings/settings.service';
import { TutorialsService } from '../tutorials/tutorials.service';
import { termSlug } from '../projects/project.model';
import { formatDuration } from '../tutorials/tutorial.model';
import { hostOf } from '../settings/settings.model';
import { renderMarkdown } from '../posts/markdown';
import { buildFeed, xmlEscape as xml } from './feed.model';
import { ogCardSvg } from './og-card.svg';

@Controller()
export class SeoController {
  constructor(
    private readonly posts: PostsService,
    private readonly projects: ProjectsService,
    private readonly settings: SettingsService,
    private readonly tutorials: TutorialsService,
  ) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  sitemap(): string {
    const base = this.settings.get().siteUrl.replace(/\/+$/, '');

    const entries: { loc: string; lastmod?: string; priority: string }[] = [
      { loc: '/', priority: '1.0' },
      { loc: '/tutorials', priority: '0.9' },
      { loc: '/projects', priority: '0.9' },
      { loc: '/about', priority: '0.8' },
      { loc: '/tags', priority: '0.6' },
    ];

    for (const subject of this.tutorials.findSubjects()) {
      entries.push({
        loc: `/tutorials/${subject.slug}`,
        lastmod: subject.updatedAt.slice(0, 10),
        priority: '0.8',
      });

      for (const lesson of this.tutorials.lessons(subject.id)) {
        entries.push({
          loc: `/tutorials/${subject.slug}/${lesson.slug}`,
          lastmod: lesson.updatedAt.slice(0, 10),
          priority: '0.7',
        });
      }
    }

    for (const post of this.posts.findPublished()) {
      entries.push({
        loc: `/post/${post.slug}`,
        lastmod: post.updatedAt.slice(0, 10),
        priority: '0.8',
      });
    }

    for (const project of this.projects.findAll()) {
      entries.push({
        loc: `/projects/${project.slug}`,
        lastmod: project.updatedAt.slice(0, 10),
        priority: '0.7',
      });
    }

    for (const { tag } of this.posts.tagCounts()) {
      entries.push({ loc: `/tag/${tag}`, priority: '0.5' });
    }

    for (const taxonomy of ['tech', 'topics', 'keywords', 'tags'] as const) {
      for (const { term } of this.projects.terms(taxonomy)) {
        entries.push({
          loc: `/${taxonomy}/${termSlug(term)}`,
          priority: '0.5',
        });
      }
    }

    const urls = entries
      .map(
        (e) => `  <url>
    <loc>${xml(base + e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}
    <priority>${e.priority}</priority>
  </url>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
  }

  @Get('feed.xml')
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  feed(): string {
    const settings = this.settings.get();

    return buildFeed({
      base: settings.siteUrl,
      title: settings.siteTitle,
      description:
        settings.shareIntro || settings.siteTagline || settings.authorBio,
      authorName: settings.authorName,
      posts: this.posts.findPublished(),
      renderHtml: renderMarkdown,
    });
  }

  /*
   * Social-share cards. A generated PNG, cached for an hour — the scrapers at
   * Facebook and the rest fetch og:image, and these pages have no photo of
   * their own to offer. Rendered on demand rather than stored, since the
   * numbers on them change as content is added.
   */
  private async sendCard(res: Response, svg: string): Promise<void> {
    try {
      const png = await sharp(Buffer.from(svg)).png().toBuffer();
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(png);
    } catch {
      // A share card is never worth a 500 — the page still previews with text.
      res.status(404).send('Card unavailable');
    }
  }

  @Get('og/tutorials.png')
  async tutorialsCard(@Res() res: Response): Promise<void> {
    const s = this.settings.get();
    const subjects = this.tutorials.findSubjects();
    const totals = this.tutorials.totals();

    const rows = subjects.slice(0, 5).map((subject) => {
      const stat = this.tutorials.stats(subject.id);
      return {
        label: subject.title,
        meta: `${stat.total} ${stat.total === 1 ? 'lesson' : 'lessons'}`,
      };
    });

    await this.sendCard(
      res,
      ogCardSvg({
        eyebrow: 'Tutorials',
        title: subjects.length ? 'Courses to work through' : s.siteTitle,
        subtitle: `${totals.subjects} ${totals.subjects === 1 ? 'course' : 'courses'} · ${totals.tutorials} ${totals.tutorials === 1 ? 'lesson' : 'lessons'} · ${formatDuration(totals.minutes)} of reading`,
        rows,
        brand: `${s.authorName}${hostOf(s.siteUrl) ? ` · ${hostOf(s.siteUrl)}` : ''}`,
      }),
    );
  }

  @Get('og/home.png')
  async homeCard(@Res() res: Response): Promise<void> {
    const s = this.settings.get();
    const posts = this.posts.findPublished().length;
    const tutorials = this.tutorials.totals().tutorials;
    const projects = this.projects.findAll().length;

    await this.sendCard(
      res,
      ogCardSvg({
        eyebrow: s.siteTitle || 'Blog',
        title: s.authorName,
        subtitle: s.siteTagline || s.authorBio || s.authorRole,
        rows: [
          { label: 'Posts', meta: String(posts) },
          { label: 'Tutorials', meta: String(tutorials) },
          { label: 'Projects', meta: String(projects) },
        ],
        brand: hostOf(s.siteUrl) || s.authorName,
      }),
    );
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  robots(): string {
    const base = this.settings.get().siteUrl.replace(/\/+$/, '');

    return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /login

Sitemap: ${base}/sitemap.xml
`;
  }
}
