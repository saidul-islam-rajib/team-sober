import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { formatDate, Post, readingMinutes } from './post.model';
import { PostsService } from './posts.service';
import { TutorialsService } from '../tutorials/tutorials.service';
import { ProjectsService } from '../projects/projects.service';
import { CommentsService } from '../comments/comments.service';
import { CurrentAccountService } from '../accounts/current-account.service';
import { renderMarkdown } from './markdown';
import {
  homePage,
  notFoundPage,
  postPage,
  tagsPage,
} from '../views/public/posts.pages';

@Controller()
export class PostsController {
  constructor(
    private readonly posts: PostsService,
    private readonly tutorials: TutorialsService,
    private readonly projects: ProjectsService,
    private readonly comments: CommentsService,
    private readonly current: CurrentAccountService,
  ) {}

  private feedStats() {
    const published = this.posts.findPublished();
    const tags = this.posts.tagCounts();

    return {
      ...this.posts.stats(),
      latestDate: published[0]?.publishedAt,
      topTag: tags[0]?.tag,
    };
  }

  @Get()
  @Header('Content-Type', 'text/html')
  home(): string {
    return homePage({
      posts: this.posts.findPublished(),
      tags: this.posts.tagCounts(),
      stats: this.feedStats(),
    });
  }

  @Get('search')
  @Header('Content-Type', 'text/html')
  search(@Query('q') q = ''): string {
    return homePage({
      posts: this.posts.search(q),
      tags: this.posts.tagCounts(),
      stats: this.feedStats(),
      query: q,
      tutorials: q.trim()
        ? this.tutorials.searchWithSubject(q).map(({ tutorial, subject }) => ({
            title: tutorial.title,
            url: `/tutorials/${subject.slug}/${tutorial.slug}`,
            meta: `${subject.title} · ${readingMinutes(tutorial.content)} min read`,
          }))
        : [],
    });
  }

  @Get('tags')
  @Header('Content-Type', 'text/html')
  tags(): string {
    const postTags = this.posts.tagCounts();
    const tags = mergeCounts(postTags, this.tutorials.tagCounts());

    const featured = postTags
      .filter((t) => t.count > 1)
      .slice(0, 6)
      .map((t) => ({
        ...t,
        posts: this.posts.byTag(t.tag).slice(0, 3),
      }));

    return tagsPage({
      tags,
      featured,
      subjectTags: this.tutorials.tagsBySubject().map((group) => ({
        title: group.subject.title,
        slug: group.subject.slug,
        icon: group.subject.icon,
        tags: group.tags,
      })),
      technologies: this.projects.terms('tech'),
      topics: this.projects.terms('topics'),
      keywords: this.projects.terms('keywords'),
      postCount: this.posts.findPublished().length,
      lessonCount: this.tutorials.allTutorials().length,
      projectCount: this.projects.findAll().length,
    });
  }

  @Get('tag/:tag')
  @Header('Content-Type', 'text/html')
  byTag(@Param('tag') tag: string): string {
    return homePage({
      posts: this.posts.byTag(tag),
      tags: mergeCounts(this.posts.tagCounts(), this.tutorials.tagCounts()),
      stats: this.feedStats(),
      activeTag: tag,
      tutorials: this.tutorials.byTag(tag).map(({ tutorial, subject }) => ({
        title: tutorial.title,
        url: `/tutorials/${subject.slug}/${tutorial.slug}`,
        meta: `${subject.title} · ${readingMinutes(tutorial.content)} min read`,
      })),
    });
  }

  @Get('post/:slug')
  post(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res() res: Response,
    @Query('commentError') commentError?: string,
  ): void {
    const published = this.posts.findPublished();
    const post = published.find((p) => p.slug === slug);

    res.type('html');

    if (!post) {
      res.status(404).send(notFoundPage());
      return;
    }

    this.posts.recordView(slug);

    const others = published.filter((p) => p.id !== post.id);

    const chosen = post.relatedIds
      .map((id) => others.find((p) => p.id === id))
      .filter((p): p is Post => Boolean(p));

    const related = chosen.length
      ? chosen
      : others
          .map((p) => ({
            p,
            shared: p.tags.filter((t) => post.tags.includes(t)).length,
          }))
          .sort((a, b) => b.shared - a.shared)
          .slice(0, 3)
          .map(({ p }) => p);

    const html = renderMarkdown(post.content);
    const account = this.current.resolve(req);

    res.send(
      postPage(post, related, html, this.comments.forPost(post.slug), {
        canComment: Boolean(account),
        viewerAccountId: account?.id,
        commentError,
      }),
    );
  }

  @Get('api/search')
  quickSearch(@Query('q') q = ''): {
    results: { title: string; url: string; kind: string; meta: string }[];
  } {
    const query = q.trim();
    if (query.length < 2) return { results: [] };

    const posts = this.posts
      .search(query)
      .slice(0, 6)
      .map((p) => ({
        title: p.title,
        url: `/post/${p.slug}`,
        kind: 'Post',
        meta: `${formatDate(p.publishedAt)} · ${readingMinutes(p.content)} min read`,
      }));

    const tutorials = this.tutorials
      .searchWithSubject(query)
      .slice(0, 4)
      .map(({ tutorial, subject }) => ({
        title: tutorial.title,
        url: `/tutorials/${subject.slug}/${tutorial.slug}`,
        kind: 'Tutorial',
        meta: `${subject.title} · ${readingMinutes(tutorial.content)} min read`,
      }));

    const tags = this.posts
      .tagCounts()
      .filter((t) => t.tag.includes(query.toLowerCase()))
      .slice(0, 3)
      .map((t) => ({
        title: t.tag,
        url: `/tag/${t.tag}`,
        kind: 'Tag',
        meta: `${t.count} post${t.count === 1 ? '' : 's'}`,
      }));

    return { results: [...posts, ...tutorials, ...tags] };
  }

  @Get('health')
  health(): { status: string; uptime: number; posts: number } {
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      posts: this.posts.findPublished().length,
    };
  }
}

function mergeCounts(
  ...lists: { tag: string; count: number }[][]
): { tag: string; count: number }[] {
  const totals = new Map<string, number>();

  for (const list of lists) {
    for (const { tag, count } of list) {
      totals.set(tag, (totals.get(tag) ?? 0) + count);
    }
  }

  return [...totals.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
