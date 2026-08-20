import {
  Body,
  Controller,
  Param,
  Post as HttpPost,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AccountRoutes, accountUrl } from '../accounts/account.routes';
import { CurrentAccountService } from '../accounts/current-account.service';
import { PostsService } from '../posts/posts.service';
import { CommentRoutes } from './comments.routes';
import { CommentsService } from './comments.service';

@Controller()
export class CommentsController {
  constructor(
    private readonly comments: CommentsService,
    private readonly posts: PostsService,
    private readonly current: CurrentAccountService,
  ) {}

  private signInFirst(res: Response, slug: string): void {
    const next = `/post/${slug}#comments`;
    res.redirect(accountUrl(AccountRoutes.signIn.template, { next }));
  }

  private backToPost(res: Response, slug: string, problem?: string): void {
    const query = problem ? `?commentError=${encodeURIComponent(problem)}` : '';
    res.redirect(`/post/${slug}${query}#comments`);
  }

  @HttpPost(CommentRoutes.create.template)
  create(
    @Param('slug') slug: string,
    @Body() body: { body?: string },
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    const account = this.current.resolve(req);

    if (!account) {
      this.signInFirst(res, slug);
      return;
    }

    const post = this.posts.findPublished().find((p) => p.slug === slug);

    if (!post) {
      res.redirect('/');
      return;
    }

    const result = this.comments.add({
      postId: post.id,
      postSlug: post.slug,
      accountId: account.id,
      authorName: account.name,
      body: body.body ?? '',
    });

    if (!result.ok) {
      this.backToPost(res, slug, result.problem);
      return;
    }

    res.redirect(`/post/${slug}#comments`);
  }

  @HttpPost(CommentRoutes.remove.template)
  remove(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    const comment = this.comments.findById(id);

    if (!comment) {
      res.redirect('/');
      return;
    }

    const account = this.current.resolve(req);

    if (account && account.id === comment.accountId) {
      this.comments.remove(id);
    }

    res.redirect(`/post/${comment.postSlug}#comments`);
  }
}
