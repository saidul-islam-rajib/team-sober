import {
  Controller,
  Get,
  Header,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { commentsAdminPage } from '../views/admin/comments.page';
import { CommentAdminRoutes } from './comments.routes';
import { CommentsService } from './comments.service';

@Controller('admin/comments')
@UseGuards(AuthGuard)
export class CommentsAdminController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  @Header('Content-Type', 'text/html')
  index(): string {
    return commentsAdminPage({ comments: this.comments.all() });
  }

  @Post(':id/hide')
  hide(@Param('id') id: string, @Res() res: Response): void {
    this.comments.setHidden(id, true);
    res.redirect(CommentAdminRoutes.list.template);
  }

  @Post(':id/show')
  show(@Param('id') id: string, @Res() res: Response): void {
    this.comments.setHidden(id, false);
    res.redirect(CommentAdminRoutes.list.template);
  }

  @Post(':id/delete')
  remove(@Param('id') id: string, @Res() res: Response): void {
    this.comments.remove(id);
    res.redirect(CommentAdminRoutes.list.template);
  }
}
