import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AdminsService } from './admins.service';
import {
  Admin,
  changeAdminEmailProblem,
  createAdminProblem,
  resetAdminPasswordProblem,
} from './admin.model';
import { AdminsRoutes } from './admins.routes';
import { adminDetailPage, adminsPage } from '../views/admin/admins.page';

const FLASHES: Record<string, string> = {
  created: 'Admin added.',
  removed: 'Admin removed.',
};

@Controller('admin/admins')
@UseGuards(AuthGuard)
export class AdminsController {
  constructor(private readonly admins: AdminsService) {}

  @Get()
  @Header('Content-Type', 'text/html')
  index(@Query('ok') ok?: string): string {
    return adminsPage({
      admins: this.admins.list(),
      flash: ok ? FLASHES[ok] : undefined,
    });
  }

  @Post()
  @HttpCode(200)
  @Header('Content-Type', 'text/html')
  async create(
    @Body('email') email: string | undefined,
    @Body('password') password: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const problem = createAdminProblem({ email, password });

    if (problem) {
      res.send(
        adminsPage({ admins: this.admins.list(), error: problem, email }),
      );
      return;
    }

    if (this.admins.findByEmail(email)) {
      res.send(
        adminsPage({
          admins: this.admins.list(),
          error: 'That email is already an admin.',
          email,
        }),
      );
      return;
    }

    await this.admins.create(email as string, password as string);
    res.redirect(`${AdminsRoutes.list.template}?ok=created`);
  }

  @Get(':id')
  @Header('Content-Type', 'text/html')
  show(@Param('id') id: string, @Res() res: Response): void {
    const admin = this.admins.findById(id);

    if (!admin) {
      res.redirect(AdminsRoutes.list.template);
      return;
    }

    res.send(adminDetailPage({ admin }));
  }

  @Post(':id/reset')
  @HttpCode(200)
  @Header('Content-Type', 'text/html')
  async resetPassword(
    @Param('id') id: string,
    @Body('password') password: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const admin = this.admins.findById(id);

    if (!admin) {
      res.redirect(AdminsRoutes.list.template);
      return;
    }

    const problem = resetAdminPasswordProblem({ password });

    if (problem) {
      res.send(adminDetailPage({ admin, error: problem }));
      return;
    }

    await this.admins.resetPassword(id, password as string);
    res.send(
      adminDetailPage({
        admin: this.admins.findById(id) as Admin,
        flash: 'Password updated.',
      }),
    );
  }

  @Post(':id/email')
  @HttpCode(200)
  @Header('Content-Type', 'text/html')
  changeEmail(
    @Param('id') id: string,
    @Body('email') email: string | undefined,
    @Res() res: Response,
  ): void {
    const admin = this.admins.findById(id);

    if (!admin) {
      res.redirect(AdminsRoutes.list.template);
      return;
    }

    const problem = changeAdminEmailProblem({ email });

    if (problem) {
      res.send(adminDetailPage({ admin, error: problem }));
      return;
    }

    const existing = this.admins.findByEmail(email);

    if (existing && existing.id !== id) {
      res.send(
        adminDetailPage({ admin, error: 'That email is already an admin.' }),
      );
      return;
    }

    this.admins.changeEmail(id, email as string);
    res.send(
      adminDetailPage({
        admin: this.admins.findById(id) as Admin,
        flash: 'Email updated.',
      }),
    );
  }

  @Post(':id/delete')
  remove(@Param('id') id: string, @Res() res: Response): void {
    this.admins.remove(id);
    res.redirect(`${AdminsRoutes.list.template}?ok=removed`);
  }
}
