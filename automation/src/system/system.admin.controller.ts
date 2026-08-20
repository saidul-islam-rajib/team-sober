import {
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { systemPage } from '../views/admin/system.page';
import { SystemService } from './system.service';

const INDEX_ROUTE = '/admin/system';

@Controller('admin/system')
@UseGuards(AuthGuard)
export class SystemAdminController {
  constructor(private readonly system: SystemService) {}

  @Get()
  @Header('Content-Type', 'text/html')
  index(@Query('cleared') cleared?: string): string {
    return systemPage({
      health: this.system.health(),
      flash: cleared
        ? `Cleared ${cleared} login lockout${cleared === '1' ? '' : 's'}.`
        : undefined,
    });
  }

  @Post('clear-lockouts')
  clearLockouts(@Res() res: Response): void {
    const count = this.system.clearLockouts();
    res.redirect(`${INDEX_ROUTE}?cleared=${count}`);
  }

  @Post('restart')
  @HttpCode(200)
  @Header('Content-Type', 'text/html')
  restart(@Res() res: Response): void {
    res.send(systemPage({ health: this.system.health(), restarting: true }));

    res.on('finish', () => {
      setTimeout(() => process.exit(0), 100);
    });
  }
}
