import { Module } from '@nestjs/common';
import { AssetsModule } from './shared/assets/assets.module';
import { ConfigService } from './shared/config/config.service';
import { ConfigController } from './shared/config/config.controller';
import { PostsController } from './posts/posts.controller';
import { AdminController } from './posts/admin.controller';
import { UploadsController } from './uploads/uploads.controller';
import { ImagesController } from './uploads/images.controller';
import { SettingsController } from './settings/settings.controller';
import { AboutController } from './about/about.controller';
import { ProjectsController } from './projects/projects.controller';
import { TutorialsController } from './tutorials/tutorials.controller';
import { TutorialsAdminController } from './tutorials/tutorials.admin.controller';
import { SeoController } from './seo/seo.controller';
import { PostsService } from './posts/posts.service';
import { UploadsService } from './uploads/uploads.service';
import { ImagesService } from './uploads/images.service';
import { SettingsService } from './settings/settings.service';
import { AboutService } from './about/about.service';
import { ProjectsService } from './projects/projects.service';
import { TutorialsService } from './tutorials/tutorials.service';
import { EnrolmentService } from './tutorials/enrolment.service';
import { CertificatesService } from './tutorials/certificates.service';
import { ProgressService } from './tutorials/progress.service';
import { AccountsService } from './accounts/accounts.service';
import { AccountSessionService } from './accounts/account-session.service';
import { CurrentAccountService } from './accounts/current-account.service';
import { PasswordTokenService } from './accounts/password-token.service';
import { AccountResetService } from './accounts/account-reset.service';
import { MailerService } from './shared/mail/mailer.service';
import { AccountRecoveryRequestService } from './accounts/account-recovery-request.service';
import { AccountAssetsBootstrap } from './accounts/account.assets.bootstrap';
import { AccountsController } from './accounts/accounts.controller';
import { AccountsAdminController } from './accounts/accounts.admin.controller';
import { AuthService } from './auth/auth.service';
import { LoginThrottleService } from './auth/login-throttle.service';
import { AdminsService } from './admins/admins.service';
import { AdminsController } from './admins/admins.controller';

@Module({
  imports: [AssetsModule],
  controllers: [
    ConfigController,
    SettingsController,
    AboutController,
    ProjectsController,
    AccountsAdminController,
    AccountsController,
    AdminsController,
    TutorialsAdminController,
    TutorialsController,
    SeoController,
    AdminController,
    UploadsController,
    ImagesController,
    PostsController,
  ],
  providers: [
    PostsService,
    UploadsService,
    ImagesService,
    SettingsService,
    AboutService,
    ProjectsService,
    TutorialsService,
    EnrolmentService,
    CertificatesService,
    ProgressService,
    AccountsService,
    AccountSessionService,
    CurrentAccountService,
    PasswordTokenService,
    AccountResetService,
    MailerService,
    AccountRecoveryRequestService,
    AccountAssetsBootstrap,
    AuthService,
    LoginThrottleService,
    AdminsService,
    ConfigService,
  ],
})
export class AppModule {}
