import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post as HttpPost,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { LiveProjectsService } from './live-projects.service';
import type { LiveProjectInput } from './live-project.model';
import {
  liveProjectDetailPage,
  liveProjectNotFoundPage,
} from '../views/public/live-projects.page';
import {
  liveProjectEditorPage,
  liveProjectsAdminPage,
} from '../views/admin/live-projects.page';

@Controller()
export class LiveProjectsController {
  constructor(private readonly liveProjects: LiveProjectsService) {}

  @Get('live/:slug')
  @Header('Content-Type', 'text/html')
  detail(@Param('slug') slug: string, @Res() res: Response): void {
    res.type('html');

    const project = this.liveProjects.findAll().find((p) => p.slug === slug);

    if (!project) {
      res.status(404).send(liveProjectNotFoundPage());
      return;
    }

    res.send(liveProjectDetailPage(project));
  }

  @Get('admin/live-projects')
  @UseGuards(AuthGuard)
  @Header('Content-Type', 'text/html')
  admin(@Query('ok') ok?: string): string {
    const messages: Record<string, string> = {
      created: 'Live project created.',
      updated: 'Live project updated.',
      deleted: 'Live project deleted.',
    };

    const flash =
      ok && messages[ok]
        ? { kind: 'ok' as const, text: messages[ok] }
        : undefined;

    return liveProjectsAdminPage({
      projects: this.liveProjects.findAll(),
      flash,
    });
  }

  @Get('admin/live-projects/new')
  @UseGuards(AuthGuard)
  @Header('Content-Type', 'text/html')
  newForm(): string {
    return liveProjectEditorPage();
  }

  @HttpPost('admin/live-projects/new')
  @UseGuards(AuthGuard)
  async create(
    @Body() body: LiveProjectInput,
    @Res() res: Response,
  ): Promise<void> {
    await this.liveProjects.create(body);
    res.redirect('/admin/live-projects?ok=created');
  }

  @Get('admin/live-projects/:id/edit')
  @UseGuards(AuthGuard)
  @Header('Content-Type', 'text/html')
  editForm(@Param('id') id: string): string {
    return liveProjectEditorPage(this.liveProjects.findById(id));
  }

  @HttpPost('admin/live-projects/:id/edit')
  @UseGuards(AuthGuard)
  async update(
    @Param('id') id: string,
    @Body() body: LiveProjectInput,
    @Res() res: Response,
  ): Promise<void> {
    await this.liveProjects.update(id, body);
    res.redirect('/admin/live-projects?ok=updated');
  }

  @HttpPost('admin/live-projects/:id/delete')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @Res() res: Response): void {
    this.liveProjects.remove(id);
    res.redirect('/admin/live-projects?ok=deleted');
  }

  @HttpPost('admin/live-projects/fetch-preview')
  @UseGuards(AuthGuard)
  async fetchPreview(@Body() body: { url?: string }) {
    return this.liveProjects.fetchPreview(body.url ?? '');
  }
}
